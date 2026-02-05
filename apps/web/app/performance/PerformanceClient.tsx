'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';
import Chart from '@/components/charts/Chart';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { IconRefresh, IconCloudDownload } from '@tabler/icons-react';

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
};

type CampaignFormat = {
  id: string;
  format_name: string;
  platform: string;
  production_type?: string | null;
  predicted_ml_score?: number | null;
  predicted_measurability_score?: number | null;
  predicted_roi_multiplier?: number | null;
  predicted_success_probability?: number | null;
  estimated_production_cost_min_brl?: number | null;
  estimated_production_cost_max_brl?: number | null;
  estimated_media_cost_brl?: number | null;
};

type CampaignDetailResponse = {
  campaign: CampaignRow;
  formats: CampaignFormat[];
};

type ReporteiKpi = {
  metric: string;
  value: number;
};

type ReporteiByFormat = {
  format: string;
  score: number;
  kpis?: ReporteiKpi[];
  notes?: string[];
};

type ReporteiByTag = {
  tag: string;
  score: number;
  kpis?: ReporteiKpi[];
};

type ReporteiPayload = {
  by_format?: ReporteiByFormat[];
  by_tag?: ReporteiByTag[];
  editorial_insights?: string[];
  observed_at?: string;
  window?: string;
};

type ReporteiInsight = {
  platform?: string;
  time_window?: string;
  created_at?: string;
  payload?: ReporteiPayload;
};

type ReporteiResponse = {
  items?: ReporteiInsight[];
  updated_at?: string | null;
};

type PerformanceClientProps = {
  clientId?: string;
  noShell?: boolean;
  embedded?: boolean;
};

function formatCurrency(value?: number | null) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

export default function PerformanceClient({ clientId, noShell, embedded }: PerformanceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [formats, setFormats] = useState<CampaignFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reporteiItems, setReporteiItems] = useState<ReporteiInsight[]>([]);
  const [reporteiUpdatedAt, setReporteiUpdatedAt] = useState<string | null>(null);
  const [reporteiLoading, setReporteiLoading] = useState(false);
  const [reporteiSyncing, setReporteiSyncing] = useState(false);

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
    if (!selectedClient) return;
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('client_id', selectedClient.id);
      const response = await apiGet<{ success: boolean; data: CampaignRow[] }>(
        `/campaigns?${qs.toString()}`
      );
      const data = response?.data || [];
      setCampaigns(data);
      if (data.length) {
        setSelectedCampaignId((prev) => prev || data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar campanhas.');
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  const loadCampaignDetail = useCallback(async () => {
    if (!selectedCampaignId) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiGet<{ success: boolean; data: CampaignDetailResponse }>(
        `/campaigns/${selectedCampaignId}`
      );
      setFormats(response?.data?.formats || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar formatos.');
    } finally {
      setLoading(false);
    }
  }, [selectedCampaignId]);

  const loadReportei = useCallback(async () => {
    if (!selectedClient) return;
    setReporteiLoading(true);
    try {
      const response = await apiGet<ReporteiResponse>(
        `/clients/${selectedClient.id}/insights/reportei`
      );
      setReporteiItems(response?.items || []);
      setReporteiUpdatedAt(response?.updated_at || null);
    } catch (err: any) {
      console.error('Failed to load Reportei:', err);
    } finally {
      setReporteiLoading(false);
    }
  }, [selectedClient]);

  const syncReportei = useCallback(async () => {
    if (!selectedClient) return;
    setReporteiSyncing(true);
    try {
      await apiGet(`/clients/${selectedClient.id}/insights/reportei/sync`);
      await loadReportei();
    } catch (err: any) {
      setError(err?.message || 'Falha ao sincronizar Reportei.');
    } finally {
      setReporteiSyncing(false);
    }
  }, [selectedClient, loadReportei]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClients, loadClientDetail]);

  useEffect(() => {
    if (!selectedClient) return;
    loadCampaigns();
    loadReportei();
  }, [selectedClient, loadCampaigns, loadReportei]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    loadCampaignDetail();
  }, [selectedCampaignId, loadCampaignDetail]);

  const totalFormats = formats.length;
  const avgMlScore = useMemo(() => {
    if (!formats.length) return 0;
    const sum = formats.reduce((acc, row) => acc + Number(row.predicted_ml_score || 0), 0);
    return Math.round(sum / formats.length);
  }, [formats]);

  // Chart data for formats
  const formatChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar' },
    xaxis: { categories: formats.map((f) => f.format_name) },
    colors: ['#5d87ff', '#49beff'],
    plotOptions: { bar: { borderRadius: 4 } },
  };
  const formatChartSeries = [
    { name: 'ML Score', data: formats.map((f) => Number(f.predicted_ml_score || 0)) },
    { name: 'Success %', data: formats.map((f) => Number(f.predicted_success_probability || 0)) },
  ];

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando performance...
        </Typography>
      </Stack>
    );
  }

  const content = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h4">Performance</Typography>
        <Typography variant="body2" color="text.secondary">
          Visao consolidada de formatos e previsoes do catalogo.
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
              <Typography variant="overline" color="text.secondary">Filtros</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedClient?.name || 'Global'} · {totalFormats} formatos
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                value={selectedClient?.id || ''}
                onChange={(event) => {
                  const match = clients.find((client) => client.id === event.target.value) || null;
                  setSelectedClient(match);
                  if (match) router.replace(`/performance?clientId=${match.id}`);
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
              <TextField
                select
                value={selectedCampaignId}
                onChange={(event) => setSelectedCampaignId(event.target.value)}
                size="small"
              >
                {campaigns.map((campaign) => (
                  <MenuItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={loadCampaignDetail}>
                Atualizar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Formatos</Typography>
              <Typography variant="h5">{formatNumber(totalFormats)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Score ML medio</Typography>
              <Typography variant="h5">{formatNumber(avgMlScore)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Formats chart */}
      {formats.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
              Scores por formato
            </Typography>
            <Chart options={formatChartOptions} series={formatChartSeries} type="bar" height={300} />
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">Reportei Performance</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {reporteiUpdatedAt
                  ? `Atualizado em ${new Date(reporteiUpdatedAt).toLocaleDateString('pt-BR')}`
                  : 'Sem atualizacao recente'}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconCloudDownload size={14} />}
                onClick={syncReportei}
                disabled={reporteiSyncing}
              >
                {reporteiSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
            </Stack>
          </Stack>

          {reporteiLoading ? (
            <Typography variant="body2" color="text.secondary">Carregando dados do Reportei...</Typography>
          ) : reporteiItems.length ? (
            <Grid container spacing={2}>
              {reporteiItems.map((item, index) => {
                const payload = item.payload || {};
                const topFormat = payload.by_format?.[0];
                const topTag = payload.by_tag?.[0];
                const kpis = (topFormat?.kpis?.length ? topFormat.kpis : topTag?.kpis || []).slice(0, 4);
                const editorial = (payload.editorial_insights || []).slice(0, 3);

                return (
                  <Grid key={item.platform || `reportei-${index}`} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2">{item.platform || 'Plataforma'}</Typography>
                          <Chip size="small" label={item.time_window || '30d'} />
                        </Stack>

                        {kpis.length > 0 && (
                          <Grid container spacing={1} sx={{ mb: 2 }}>
                            {kpis.map((kpi, i) => (
                              <Grid key={i} size={{ xs: 6 }}>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                                  <Typography variant="subtitle2">{formatNumber(kpi.value)}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {kpi.metric.replace(/_/g, ' ')}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        )}

                        {topFormat && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Top formato: {topFormat.format} {topFormat.score > 0 ? `(Score: ${topFormat.score})` : ''}
                          </Typography>
                        )}

                        {editorial.length > 0 && (
                          <Stack spacing={0.5}>
                            {editorial.map((insight, i) => (
                              <Typography key={i} variant="caption" color="text.secondary">
                                - {insight}
                              </Typography>
                            ))}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem dados do Reportei disponiveis. Configure o conector nas integracoes do cliente.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="overline" color="text.secondary">Formatos da campanha</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {formats.length ? (
              formats.map((format) => (
                <Box key={format.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="subtitle2">{format.format_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format.production_type || 'Geral'} · {format.platform}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip size="small" label={`ML ${formatNumber(format.predicted_ml_score)}`} />
                        <Chip size="small" label={`ROI ${formatNumber(format.predicted_roi_multiplier)}x`} />
                        <Chip size="small" label={`Sucesso ${formatNumber(format.predicted_success_probability)}%`} />
                      </Stack>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Prod {formatCurrency(format.estimated_production_cost_min_brl)} - {formatCurrency(format.estimated_production_cost_max_brl)}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhum formato encontrado.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell
      title="Performance"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Studio</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Performance</Typography>
        </Stack>
      }
    >
      {content}
    </AppShell>
  );
}
