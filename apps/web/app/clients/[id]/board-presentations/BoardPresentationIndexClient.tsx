'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconAlertTriangle, IconChecks, IconPresentation, IconRefresh, IconSparkles } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type ReadinessPlatform = {
  slug: string;
  label: string;
  snapshot_period_end: string | null;
  last_reportei_snapshot_at: string | null;
};

type ReadinessIssue = {
  platform: string;
  metric: string;
  reason: string;
};

type BoardPresentationReadiness = {
  status: 'ready' | 'blocked';
  period_month: string;
  active_platforms: ReadinessPlatform[];
  missing_metrics: ReadinessIssue[];
  blocking_reasons: string[];
  last_reportei_snapshot_at: string | null;
  checked_at: string;
};

type BoardPresentationListItem = {
  id: string;
  client_id: string;
  period_month: string;
  status: 'draft' | 'review' | 'approved' | 'exported';
  template_version: string;
  pptx_key: string | null;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
  readiness: BoardPresentationReadiness | null;
};

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function getDefaultClosedMonth() {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - 1);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(periodMonth: string) {
  const [year, month] = periodMonth.split('-');
  const monthIndex = Number(month) - 1;
  return `${MONTH_LABELS[monthIndex] || month}/${year}`;
}

function statusColor(status: BoardPresentationListItem['status']) {
  if (status === 'exported') return 'success';
  if (status === 'approved') return 'primary';
  if (status === 'review') return 'warning';
  return 'default';
}

export default function BoardPresentationIndexClient({
  clientId,
  embedded = false,
}: {
  clientId: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [periodMonth, setPeriodMonth] = useState(getDefaultClosedMonth);
  const [presentations, setPresentations] = useState<BoardPresentationListItem[]>([]);
  const [readiness, setReadiness] = useState<BoardPresentationReadiness | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReadiness, setLoadingReadiness] = useState(true);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [error, setError] = useState('');

  const loadPresentations = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiGet<{ presentations: BoardPresentationListItem[] }>(
        `/clients/${clientId}/board-presentations`,
      );
      setPresentations(data.presentations || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar apresentações.');
    } finally {
      setLoadingList(false);
    }
  }, [clientId]);

  const loadReadiness = useCallback(async () => {
    setLoadingReadiness(true);
    setError('');
    try {
      const data = await apiPost<{ readiness: BoardPresentationReadiness }>(
        `/clients/${clientId}/board-presentations/preflight`,
        { period_month: periodMonth },
      );
      setReadiness(data.readiness);
    } catch (err: any) {
      setError(err?.message || 'Erro ao validar dados obrigatórios.');
      setReadiness(null);
    } finally {
      setLoadingReadiness(false);
    }
  }, [clientId, periodMonth]);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

  const currentPresentation = presentations.find((item) => item.period_month === periodMonth);

  const handleCreateDraft = async () => {
    setCreatingDraft(true);
    setError('');
    try {
      const data = await apiPost<{ presentation: BoardPresentationListItem }>(
        `/clients/${clientId}/board-presentations/draft`,
        { period_month: periodMonth },
      );
      await loadPresentations();
      router.push(`/clients/${clientId}/board-presentations/${data.presentation.id}`);
    } catch (err: any) {
      if (err?.payload?.readiness) {
        setReadiness(err.payload.readiness);
      }
      setError(err?.message || 'Erro ao preparar apresentação.');
    } finally {
      setCreatingDraft(false);
    }
  };

  return (
    <Box>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
            <IconPresentation size={22} />
            <Typography variant="h5" fontWeight={700}>Board Presentation</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Geração mensal do deck executivo com bloqueio de dados. Sem Reportei completo, sem apresentação.
          </Typography>
        </Box>
      )}

      {error ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert> : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Preflight do mês</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Checa se o mês está fechado e se o Reportei cobre todas as redes ativas.
                  </Typography>
                </Box>
                <Button size="small" startIcon={<IconRefresh size={15} />} onClick={loadReadiness}>
                  Validar
                </Button>
              </Stack>

              <TextField
                label="Mês de referência"
                type="month"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              {loadingReadiness ? (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 180 }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : readiness ? (
                <Stack spacing={2}>
                  <Alert severity={readiness.status === 'ready' ? 'success' : 'warning'}>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={700}>
                        {readiness.status === 'ready' ? 'Mês apto para geração' : 'Geração bloqueada'}
                      </Typography>
                      <Typography variant="body2">
                        Referência: {formatMonthLabel(readiness.period_month)}
                      </Typography>
                    </Stack>
                  </Alert>

                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Plataformas ativas</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {readiness.active_platforms.map((platform) => (
                        <Chip
                          key={platform.slug}
                          label={`${platform.label}${platform.snapshot_period_end ? ` · ${platform.snapshot_period_end}` : ''}`}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                      {readiness.active_platforms.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Nenhuma plataforma ativa mapeada.</Typography>
                      ) : null}
                    </Stack>
                  </Box>

                  {readiness.blocking_reasons.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Bloqueios</Typography>
                      <Stack spacing={1}>
                        {readiness.blocking_reasons.map((reason) => (
                          <Alert key={reason} severity="warning" icon={<IconAlertTriangle size={16} />}>
                            {reason}
                          </Alert>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {readiness.missing_metrics.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Métricas ausentes</Typography>
                      <Stack spacing={1}>
                        {readiness.missing_metrics.map((item) => (
                          <Box key={`${item.platform}-${item.metric}`} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                            <Typography variant="body2" fontWeight={700}>{item.platform} · {item.metric}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.reason}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<IconSparkles size={16} />}
                    onClick={handleCreateDraft}
                    disabled={creatingDraft || readiness.status !== 'ready'}
                  >
                    {currentPresentation ? 'Atualizar draft do mês' : 'Criar draft do mês'}
                  </Button>
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>Apresentações geradas</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Histórico mensal do deck de Board. O editor sempre abre na versão viva daquele mês.
                  </Typography>
                </Box>
                {currentPresentation ? (
                  <Button variant="outlined" onClick={() => router.push(`/clients/${clientId}/board-presentations/${currentPresentation.id}`)}>
                    Abrir mês selecionado
                  </Button>
                ) : null}
              </Stack>

              {loadingList ? (
                <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 220 }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : presentations.length === 0 ? (
                <Alert severity="info" icon={<IconChecks size={16} />}>
                  Nenhuma apresentação criada ainda. Rode o preflight e gere o primeiro draft.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {presentations.map((item, index) => (
                    <Box key={item.id}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        spacing={2}
                        sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{formatMonthLabel(item.period_month)}</Typography>
                            <Chip size="small" color={statusColor(item.status)} label={item.status} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Template {item.template_version} · atualizado em {new Date(item.updated_at).toLocaleString('pt-BR')}
                          </Typography>
                          {item.readiness?.status === 'blocked' ? (
                            <Typography variant="caption" color="warning.main">
                              Houve bloqueio de dados registrado neste mês.
                            </Typography>
                          ) : null}
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button variant="outlined" onClick={() => router.push(`/clients/${clientId}/board-presentations/${item.id}`)}>
                            Abrir editor
                          </Button>
                        </Stack>
                      </Stack>
                      {index < presentations.length - 1 ? <Divider sx={{ my: 0.5, opacity: 0 }} /> : null}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
