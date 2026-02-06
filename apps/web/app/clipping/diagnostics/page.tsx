'use client';

import { useState, useCallback, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import { apiGet, apiPost, apiPatch, apiDelete, getApiBase } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconPlayerPlay,
  IconPlayerPause,
  IconDatabase,
  IconRss,
  IconBug,
  IconPlugConnected,
  IconPlugConnectedX,
  IconTrash,
  IconExternalLink,
  IconPencil,
  IconDeviceFloppy,
} from '@tabler/icons-react';

type DiagnosticsData = {
  migrations_applied: Array<{ name: string; run_at: string }>;
  column_checks: Record<string, boolean>;
  feedback_table_exists: boolean;
  job_queue_stats: Array<{ type: string; status: string; count: number }>;
  recent_failed_jobs: Array<{
    id: string;
    type: string;
    error: string;
    updated_at: string;
    source_id?: string;
    source_name?: string;
    source_url?: string;
  }>;
  sources: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    is_active: boolean;
    last_fetched_at: string | null;
    fetch_interval_minutes: number;
    health: string | null;
    last_error: string | null;
  }>;
  pending_jobs: Array<{ type: string; status: string; count: number }>;
  items: { total: number; last_24h: number; last_7d: number; last_item_at: string | null };
  errors?: string[];
};

type ConnectivityStatus = 'checking' | 'ok' | 'down' | 'auth_error' | 'unknown';

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <IconCheck size={18} color="#13DEB9" />
  ) : (
    <IconX size={18} color="#FA896B" />
  );
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atras`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
}

export default function ClippingDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backfillDays, setBackfillDays] = useState('7');
  const [backfillResult, setBackfillResult] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>('checking');
  const [connectivityDetail, setConnectivityDetail] = useState('');

  // Check backend connectivity on mount — try multiple endpoints
  useEffect(() => {
    async function checkBackend() {
      setConnectivity('checking');
      setConnectivityDetail('');
      const base = getApiBase();
      // Try the health endpoint through the proxy. The proxy prepends /api,
      // so we try both /health (which becomes /api/health) and also a known
      // clipping endpoint. Any HTTP response (even 401/404) means the backend is up.
      const endpoints = [`${base}/health`, `${base}/clipping/sources`];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { method: 'GET' });
          // Any HTTP response means the backend process is running
          setConnectivity('ok');
          setConnectivityDetail(`Backend respondeu (status ${res.status}) — esta online`);
          return;
        } catch {
          // Continue to next endpoint
        }
      }
      // All endpoints failed — backend is unreachable
      setConnectivity('down');
      setConnectivityDetail(
        'O servidor backend NAO esta respondendo. Verifique o Railway: o servico pode estar parado ou em erro.'
      );
    }
    checkBackend();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<DiagnosticsData>('/clipping/admin/diagnostics');
      setData(res);
    } catch (err: any) {
      const msg = err?.message || 'Falha ao carregar diagnostico.';
      if (msg.includes('Proxy request failed')) {
        setError('Backend indisponivel. O servidor nao esta respondendo. Verifique o Railway.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillResult('');
    try {
      const res = await apiPost<{ ok: boolean; enqueued: number }>('/clipping/admin/backfill', {
        days: Number(backfillDays) || 7,
      });
      setBackfillResult(`${res?.enqueued ?? 0} items enfileirados para reprocessamento.`);
    } catch (err: any) {
      setBackfillResult(`Erro: ${err?.message || 'falha'}`);
    } finally {
      setBackfilling(false);
    }
  };

  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState('');
  const [savingSource, setSavingSource] = useState(false);

  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState('');

  const [cancellingFetchProcessing, setCancellingFetchProcessing] = useState(false);
  const [cancelFetchProcessingResult, setCancelFetchProcessingResult] = useState('');

  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchAllResult, setFetchAllResult] = useState('');

  const handleFetchAll = async () => {
    setFetchingAll(true);
    setFetchAllResult('');
    try {
      const res = await apiPost<{ ok: boolean; sources_enqueued: number }>('/clipping/admin/fetch-all', {});
      setFetchAllResult(`${res?.sources_enqueued ?? 0} fontes enfileiradas para busca imediata.`);
    } catch (err: any) {
      setFetchAllResult(`Erro: ${err?.message || 'falha'}`);
    } finally {
      setFetchingAll(false);
    }
  };

  const handlePurgeQueue = async () => {
    if (!window.confirm('Isso vai deletar TODOS os jobs de clipping pendentes na fila. Continuar?')) return;
    setPurging(true);
    setPurgeResult('');
    try {
      const res = await apiPost<{ ok: boolean; deleted: number }>('/clipping/admin/purge-queue', {});
      setPurgeResult(`${(res?.deleted ?? 0).toLocaleString('pt-BR')} jobs removidos da fila.`);
      await load();
    } catch (err: any) {
      setPurgeResult(`Erro: ${err?.message || 'falha'}`);
    } finally {
      setPurging(false);
    }
  };

  const handleCancelFetchProcessing = async () => {
    if (!window.confirm('Isso vai CANCELAR os jobs de fetch que estao em processamento (viram FAILED). Continuar?')) return;
    setCancellingFetchProcessing(true);
    setCancelFetchProcessingResult('');
    try {
      const res = await apiPost<{ ok: boolean; cancelled_jobs: number; touched_sources: number }>(
        '/clipping/admin/cancel-fetch-processing',
        { olderThanMinutes: 0 }
      );
      const cancelled = res?.cancelled_jobs ?? 0;
      const touched = res?.touched_sources ?? 0;
      setCancelFetchProcessingResult(
        `${cancelled.toLocaleString('pt-BR')} jobs cancelados. ${touched.toLocaleString('pt-BR')} fontes marcadas como erro.`
      );
      await load();
    } catch (err: any) {
      setCancelFetchProcessingResult(`Erro: ${err?.message || 'falha'}`);
    } finally {
      setCancellingFetchProcessing(false);
    }
  };

  const handlePauseSource = async (sourceId: string) => {
    try {
      await apiPost(`/clipping/sources/${sourceId}/pause`, {});
      await load();
    } catch { /* ignore */ }
  };

  const handleResumeSource = async (sourceId: string) => {
    try {
      await apiPost(`/clipping/sources/${sourceId}/resume`, {});
      await load();
    } catch { /* ignore */ }
  };

  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    if (!window.confirm(`Tem certeza que quer deletar a fonte "${sourceName}"? Todos os items dessa fonte tambem serao removidos.`)) return;
    try {
      await apiDelete(`/clipping/sources/${sourceId}`);
      await load();
    } catch { /* ignore */ }
  };

  const handleEditSource = (sourceId: string, currentUrl: string) => {
    setEditingSourceId(sourceId);
    setEditingUrl(currentUrl);
  };

  const handleCancelEdit = () => {
    setEditingSourceId(null);
    setEditingUrl('');
  };

  const handleSaveSourceUrl = async (sourceId: string) => {
    if (!editingUrl.trim()) return;
    setSavingSource(true);
    try {
      await apiPatch(`/clipping/sources/${sourceId}`, { url: editingUrl.trim() });
      setEditingSourceId(null);
      setEditingUrl('');
      await load();
    } catch { /* ignore */ }
    finally { setSavingSource(false); }
  };

  const allColumnsOk = data ? Object.values(data.column_checks).every(Boolean) : false;
  const migrationsOk = data ? data.migrations_applied.length >= 3 : false;
  const failedJobsCount = data?.recent_failed_jobs?.length || 0;

  const totalQueuedJobs = data
    ? data.job_queue_stats
        .filter((s) => s.status === 'queued')
        .reduce((sum, s) => sum + s.count, 0)
    : 0;
  const queueClogged = totalQueuedJobs > 1000;

  const processingFetchCount = data
    ? (data.job_queue_stats.find((s) => s.type === 'clipping_fetch_source' && s.status === 'processing')?.count ?? 0)
    : 0;

  const overallHealth = data
    ? allColumnsOk && migrationsOk && data.feedback_table_exists && failedJobsCount === 0 && !queueClogged
    : null;

  return (
    <AppShell title="Radar Diagnostics">
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Diagnostico do Radar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status das migrations, worker, fontes e fila de jobs.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <IconRefresh size={18} />}
            onClick={load}
            disabled={loading}
          >
            {data ? 'Atualizar' : 'Executar Diagnostico'}
          </Button>
        </Stack>

        {/* Connectivity check */}
        <Alert
          severity={
            connectivity === 'ok' ? 'success' :
            connectivity === 'down' ? 'error' :
            connectivity === 'checking' ? 'info' :
            'warning'
          }
          icon={
            connectivity === 'checking' ? <CircularProgress size={18} /> :
            connectivity === 'ok' ? <IconPlugConnected size={20} /> :
            connectivity === 'down' ? <IconPlugConnectedX size={20} /> :
            <IconAlertTriangle size={20} />
          }
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" fontWeight={600}>
            {connectivity === 'checking' && 'Verificando conexao com o backend...'}
            {connectivity === 'ok' && 'Backend online'}
            {connectivity === 'down' && 'Backend OFFLINE'}
            {connectivity === 'unknown' && 'Status do backend incerto'}
          </Typography>
          {connectivityDetail && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {connectivityDetail}
            </Typography>
          )}
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!data && !loading && (
          <DashboardCard>
            <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
              {connectivity === 'down' ? (
                <>
                  <IconPlugConnectedX size={48} color="#FA896B" />
                  <Typography variant="h6">Backend indisponivel</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 500 }}>
                    O servidor backend nao esta respondendo. Acesse o painel do Railway e verifique se o servico
                    &quot;backend&quot; esta rodando. Pode ser que o deploy tenha falhado ou o servico esteja reiniciando.
                  </Typography>
                </>
              ) : (
                <>
                  <IconBug size={48} color="#5D87FF" />
                  <Typography variant="h6">Clique em &quot;Executar Diagnostico&quot; para verificar o status do Radar</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vai checar migrations, colunas, fila de jobs, fontes e items recentes.
                  </Typography>
                </>
              )}
            </Stack>
          </DashboardCard>
        )}

        {loading && !data && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {data && (
          <>
            {/* Overall health */}
            <Alert
              severity={overallHealth ? 'success' : 'warning'}
              icon={overallHealth ? <IconCheck size={20} /> : <IconAlertTriangle size={20} />}
              sx={{ mb: 2 }}
            >
              {overallHealth
                ? 'Pipeline saudavel. Migrations OK, colunas OK, sem jobs falhando.'
                : 'Problemas detectados. Veja os detalhes abaixo.'}
            </Alert>

            {data.errors && data.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Erros ao consultar banco:</Typography>
                {data.errors.map((e, i) => (
                  <Typography key={i} variant="body2" fontFamily="monospace">{e}</Typography>
                ))}
              </Alert>
            )}

            {queueClogged && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                  Fila TRAVADA — {totalQueuedJobs.toLocaleString('pt-BR')} jobs acumulados
                </Typography>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Houve um bug que criava jobs duplicados a cada 5 segundos. O bug ja foi corrigido, mas os jobs
                  acumulados precisam ser removidos para a fila voltar a funcionar normalmente. Clique abaixo para limpar.
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={purging ? <CircularProgress size={14} color="inherit" /> : <IconTrash size={16} />}
                  onClick={handlePurgeQueue}
                  disabled={purging}
                >
                  {purging ? 'Limpando...' : 'Limpar fila agora'}
                </Button>
                {purgeResult && (
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    {purgeResult}
                  </Typography>
                )}
              </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Migrations */}
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardCard
                  title="Migrations"
                  action={
                    <Chip
                      size="small"
                      icon={<IconDatabase size={14} />}
                      label={migrationsOk ? 'OK' : 'Pendente'}
                      color={migrationsOk ? 'success' : 'error'}
                      variant="outlined"
                    />
                  }
                >
                  <Stack spacing={1}>
                    {data.migrations_applied.length ? (
                      data.migrations_applied.map((m) => (
                        <Stack key={m.name} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontFamily="monospace">
                            {m.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(m.run_at).toLocaleString('pt-BR')}
                          </Typography>
                        </Stack>
                      ))
                    ) : (
                      <Alert severity="error">
                        Nenhuma migration do overhaul foi aplicada! As 3 migrations (0134, 0135, 0136) precisam rodar.
                      </Alert>
                    )}
                  </Stack>
                </DashboardCard>
              </Grid>

              {/* Column checks */}
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardCard
                  title="Colunas novas"
                  action={
                    <Chip
                      size="small"
                      label={allColumnsOk ? 'OK' : 'Faltando'}
                      color={allColumnsOk ? 'success' : 'error'}
                      variant="outlined"
                    />
                  }
                >
                  <Stack spacing={1}>
                    {Object.entries(data.column_checks).map(([col, ok]) => (
                      <Stack key={col} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontFamily="monospace">
                          {col}
                        </Typography>
                        <StatusIcon ok={ok} />
                      </Stack>
                    ))}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontFamily="monospace">
                        clipping_feedback (tabela)
                      </Typography>
                      <StatusIcon ok={data.feedback_table_exists} />
                    </Stack>
                  </Stack>
                </DashboardCard>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Items count */}
              <Grid size={{ xs: 12, md: 4 }}>
                <DashboardCard title="Items recentes">
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Total</Typography>
                      <Typography variant="body2" fontWeight={700}>{data.items.total}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Ultimas 24h</Typography>
                      <Typography variant="body2" fontWeight={700} color={data.items.last_24h > 0 ? 'success.main' : 'error.main'}>
                        {data.items.last_24h}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Ultimos 7 dias</Typography>
                      <Typography variant="body2" fontWeight={700} color={data.items.last_7d > 0 ? 'success.main' : 'warning.main'}>
                        {data.items.last_7d}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Ultimo item criado</Typography>
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        {timeAgo(data.items.last_item_at)}
                      </Typography>
                    </Stack>
                    {(data.pending_jobs?.length > 0) && (
                      <>
                        <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ mt: 1 }}>
                          Jobs pendentes:
                        </Typography>
                        {data.pending_jobs.map((pj, i) => (
                          <Stack key={i} direction="row" justifyContent="space-between">
                            <Typography variant="caption" fontFamily="monospace">{pj.type} ({pj.status})</Typography>
                            <Typography variant="caption" fontWeight={700}>{pj.count}</Typography>
                          </Stack>
                        ))}
                      </>
                    )}
                  </Stack>
                </DashboardCard>
              </Grid>

              {/* Job queue */}
              <Grid size={{ xs: 12, md: 8 }}>
                <DashboardCard
                  title="Fila de Jobs"
                  action={
                    processingFetchCount > 0 ? (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={cancellingFetchProcessing ? <CircularProgress size={14} color="inherit" /> : <IconX size={16} />}
                        onClick={handleCancelFetchProcessing}
                        disabled={cancellingFetchProcessing}
                      >
                        Cancelar fetch ({processingFetchCount})
                      </Button>
                    ) : null
                  }
                  noPadding
                >
                  {cancelFetchProcessingResult && (
                    <Alert severity={cancelFetchProcessingResult.startsWith('Erro') ? 'error' : 'success'} sx={{ m: 2 }}>
                      {cancelFetchProcessingResult}
                    </Alert>
                  )}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.job_queue_stats.length ? (
                          data.job_queue_stats.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Typography variant="body2" fontFamily="monospace">
                                  {row.type}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={row.status}
                                  color={
                                    row.status === 'done' ? 'success' :
                                    row.status === 'failed' ? 'error' :
                                    row.status === 'processing' ? 'warning' :
                                    'default'
                                  }
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600}>{row.count}</Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Nenhum job de clipping na fila
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </DashboardCard>
              </Grid>
            </Grid>

            {/* Sources */}
            <DashboardCard
              title="Saude das Fontes"
              action={
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`${data.sources.filter(s => s.health === 'ERROR').length} com erro`} color="error" variant="outlined" />
                  <Chip size="small" icon={<IconRss size={14} />} label={`${data.sources.length} fontes`} variant="outlined" />
                </Stack>
              }
              noPadding
              sx={{ mb: 3 }}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome / URL</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Erro</TableCell>
                      <TableCell>Ultimo fetch</TableCell>
                      <TableCell>Intervalo</TableCell>
                      <TableCell align="right">Acoes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.sources.length ? (
                      data.sources.map((src) => {
                        const isEditing = editingSourceId === src.id;
                        return (
                        <TableRow key={src.id} sx={src.health === 'ERROR' ? { bgcolor: 'error.lighter' } : undefined}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{src.name}</Typography>
                            {isEditing ? (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                                <TextField
                                  size="small"
                                  value={editingUrl}
                                  onChange={(e) => setEditingUrl(e.target.value)}
                                  placeholder="https://..."
                                  fullWidth
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveSourceUrl(src.id);
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
                                />
                                <Tooltip title="Salvar">
                                  <IconButton size="small" color="primary" onClick={() => handleSaveSourceUrl(src.id)} disabled={savingSource}>
                                    {savingSource ? <CircularProgress size={16} /> : <IconDeviceFloppy size={16} />}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancelar">
                                  <IconButton size="small" onClick={handleCancelEdit}>
                                    <IconX size={16} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {src.url}
                                </Typography>
                                <Tooltip title="Editar URL">
                                  <IconButton size="small" onClick={() => handleEditSource(src.id, src.url)} sx={{ p: 0.25 }}>
                                    <IconPencil size={13} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            {src.health === 'ERROR' ? (
                              <Chip size="small" label="ERRO" color="error" variant="filled" />
                            ) : !src.is_active ? (
                              <Chip size="small" label="Pausada" color="default" variant="outlined" />
                            ) : (
                              <Chip size="small" label="OK" color="success" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            {src.last_error ? (
                              <Typography variant="caption" color="error.main" sx={{ maxWidth: 250, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {src.last_error}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color={src.last_fetched_at ? 'text.secondary' : 'error.main'}>
                              {timeAgo(src.last_fetched_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{src.fetch_interval_minutes}min</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              {src.url && (
                                <Tooltip title="Abrir URL">
                                  <IconButton size="small" component="a" href={src.url} target="_blank" rel="noreferrer">
                                    <IconExternalLink size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {src.is_active ? (
                                <Tooltip title="Pausar">
                                  <IconButton size="small" onClick={() => handlePauseSource(src.id)}>
                                    <IconPlayerPause size={16} />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Reativar">
                                  <IconButton size="small" color="success" onClick={() => handleResumeSource(src.id)}>
                                    <IconPlayerPlay size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Deletar fonte">
                                <IconButton size="small" color="error" onClick={() => handleDeleteSource(src.id, src.name)}>
                                  <IconTrash size={16} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Nenhuma fonte cadastrada
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </DashboardCard>

            {/* Admin actions */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardCard title="Buscar todas as fontes">
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Forca a busca imediata de TODAS as fontes ativas, ignorando o intervalo configurado.
                    Use para trazer noticias novas agora.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={fetchingAll ? <CircularProgress size={16} color="inherit" /> : <IconRss size={18} />}
                    onClick={handleFetchAll}
                    disabled={fetchingAll}
                  >
                    {fetchingAll ? 'Enfileirando...' : 'Buscar agora'}
                  </Button>
                  {fetchAllResult && (
                    <Alert severity={fetchAllResult.startsWith('Erro') ? 'error' : 'success'} sx={{ mt: 2 }}>
                      {fetchAllResult}
                    </Alert>
                  )}
                </DashboardCard>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <DashboardCard title="Reprocessar items">
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Re-enfileira items recentes para enriquecimento + auto-score contra todos os clientes.
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                      label="Dias"
                      type="number"
                      value={backfillDays}
                      onChange={(e) => setBackfillDays(e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                      inputProps={{ min: 1, max: 30 }}
                    />
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={backfilling ? <CircularProgress size={16} color="inherit" /> : <IconPlayerPlay size={18} />}
                      onClick={handleBackfill}
                      disabled={backfilling}
                    >
                      {backfilling ? 'Enfileirando...' : 'Reprocessar'}
                    </Button>
                  </Stack>
                  {backfillResult && (
                    <Alert severity={backfillResult.startsWith('Erro') ? 'error' : 'success'} sx={{ mt: 2 }}>
                      {backfillResult}
                    </Alert>
                  )}
                </DashboardCard>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </AppShell>
  );
}
