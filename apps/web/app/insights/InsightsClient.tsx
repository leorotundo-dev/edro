'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
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
import { IconRefresh, IconSparkles } from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  segment_primary?: string | null;
  city?: string | null;
};

type ClippingMatch = {
  itemId?: string;
  item_id?: string;
  score?: number;
  title?: string;
  snippet?: string;
  url?: string;
  published_at?: string;
};

type TrendRow = {
  keyword: string;
  platform: string;
  mention_count: number;
  total_engagement: number;
  average_sentiment: number;
  created_at?: string;
};

type StatsResponse = {
  summary?: {
    total?: number;
    positive?: number;
    negative?: number;
    neutral?: number;
    avg_score?: number;
  };
  platforms?: { platform: string; total: number }[];
  top_keywords?: { keyword: string; total: number }[];
};

type UpcomingEvent = {
  date: string;
  id: string;
  name: string;
  score?: number;
  tier?: string;
};

type AIOpportunity = {
  id: string;
  title: string;
  description?: string;
  source?: string;
  confidence?: number;
  suggested_action?: string;
  priority?: string;
  status?: string;
  created_at?: string;
};

type InsightsClientProps = {
  clientId?: string;
  noShell?: boolean;
  embedded?: boolean;
};

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
}

export default function InsightsClient({ clientId, noShell, embedded }: InsightsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [stats, setStats] = useState<StatsResponse>({});
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [matches, setMatches] = useState<ClippingMatch[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [opportunities, setOpportunities] = useState<AIOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingOpportunities, setGeneratingOpportunities] = useState(false);

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

  const loadInsights = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError('');
    try {
      const [statsResp, trendsResp, matchesResp, upcomingResp] = await Promise.all([
        apiGet<StatsResponse>(`/social-listening/stats?clientId=${selectedClient.id}`),
        apiGet<TrendRow[]>(`/social-listening/trends?clientId=${selectedClient.id}`),
        apiGet<{ matches: ClippingMatch[] }>(`/clipping/matches/${selectedClient.id}?limit=8`),
        apiGet<{ items: UpcomingEvent[] }>(`/clients/${selectedClient.id}/calendar/upcoming?days=14`),
      ]);
      setStats(statsResp || {});
      setTrends(trendsResp || []);
      setMatches(matchesResp?.matches || []);
      setUpcoming(upcomingResp?.items || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar insights.');
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  const loadOpportunities = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const response = await apiGet<{ data: { opportunities: AIOpportunity[] } }>(
        `/clients/${selectedClient.id}/insights/opportunities`
      );
      setOpportunities(response?.data?.opportunities || []);
    } catch (err: any) {
      console.error('Failed to load opportunities:', err);
    }
  }, [selectedClient]);

  const generateOpportunities = useCallback(async () => {
    if (!selectedClient) return;
    setGeneratingOpportunities(true);
    try {
      await apiPost(`/clients/${selectedClient.id}/insights/opportunities/generate`, {});
      await loadOpportunities();
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar oportunidades.');
    } finally {
      setGeneratingOpportunities(false);
    }
  }, [selectedClient, loadOpportunities]);

  const updateOpportunityStatus = useCallback(async (opportunityId: string, status: string) => {
    if (!selectedClient) return;
    try {
      await apiPatch(`/clients/${selectedClient.id}/insights/opportunities/${opportunityId}`, { status });
      await loadOpportunities();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar oportunidade.');
    }
  }, [selectedClient, loadOpportunities]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClients, loadClientDetail]);

  useEffect(() => {
    if (!selectedClient) return;
    loadInsights();
    loadOpportunities();
  }, [selectedClient, loadInsights, loadOpportunities]);

  const summary = stats.summary || {};
  const platforms = stats.platforms || [];
  const topKeywords = stats.top_keywords || [];

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando insights...
        </Typography>
      </Stack>
    );
  }

  const sentimentChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: ['Positivas', 'Neutras', 'Negativas'],
    colors: ['#4caf50', '#ff9800', '#f44336'],
    legend: { position: 'bottom' },
  };
  const sentimentChartSeries = [
    Number(summary.positive || 0),
    Number(summary.neutral || 0),
    Number(summary.negative || 0),
  ];
  const hasSentimentData = sentimentChartSeries.some((v) => v > 0);

  const keywordChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar' },
    xaxis: { categories: topKeywords.map((kw) => kw.keyword) },
    colors: ['#5d87ff'],
    plotOptions: { bar: { borderRadius: 4 } },
  };
  const keywordChartSeries = [{ name: 'Mencoes', data: topKeywords.map((kw) => kw.total) }];

  const platformChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar' },
    xaxis: { categories: platforms.map((p) => p.platform) },
    colors: ['#49beff'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  };
  const platformChartSeries = [{ name: 'Total', data: platforms.map((p) => p.total) }];

  const content = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h4">Insights Estrategicos</Typography>
        <Typography variant="body2" color="text.secondary">
          Visao consolidada de tendencias, oportunidades e calendario relevante.
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
              <Typography variant="overline" color="text.secondary">
                Filtros
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedClient?.name || 'Global'} · {selectedClient?.segment_primary || 'Base global'}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                value={selectedClient?.id || ''}
                onChange={(event) => {
                  const match = clients.find((client) => client.id === event.target.value) || null;
                  setSelectedClient(match);
                  if (match) router.replace(`/insights?clientId=${match.id}`);
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
              <Button variant="outlined" startIcon={<IconRefresh size={16} />} onClick={loadInsights}>
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
              <Typography variant="overline" color="text.secondary">Volume social</Typography>
              <Typography variant="h5">{formatNumber(summary.total)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Positivas</Typography>
              <Typography variant="h5">{formatNumber(summary.positive)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Neutras</Typography>
              <Typography variant="h5">{formatNumber(summary.neutral)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Negativas</Typography>
              <Typography variant="h5">{formatNumber(summary.negative)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Sentimento medio</Typography>
              <Typography variant="h5">{formatNumber(summary.avg_score)}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts row */}
      {hasSentimentData ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                  Sentimento
                </Typography>
                <Chart options={sentimentChartOptions} series={sentimentChartSeries} type="donut" height={260} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                  Top Keywords
                </Typography>
                {topKeywords.length ? (
                  <Chart options={keywordChartOptions} series={keywordChartSeries} type="bar" height={260} />
                ) : (
                  <Typography variant="body2" color="text.secondary">Sem dados.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>
                  Por Plataforma
                </Typography>
                {platforms.length ? (
                  <Chart options={platformChartOptions} series={platformChartSeries} type="bar" height={260} />
                ) : (
                  <Typography variant="body2" color="text.secondary">Sem dados.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Top keywords</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {topKeywords.length ? (
                    topKeywords.map((keyword) => (
                      <Stack key={keyword.keyword} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{keyword.keyword}</Typography>
                        <Chip size="small" label={formatNumber(keyword.total)} />
                      </Stack>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem palavras-chave.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Plataformas</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {platforms.length ? (
                    platforms.map((platform) => (
                      <Stack key={platform.platform} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{platform.platform}</Typography>
                        <Chip size="small" label={formatNumber(platform.total)} />
                      </Stack>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem dados por plataforma.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Tendencias (24h)</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {trends.length ? (
                    trends.map((trend) => (
                      <Box key={`${trend.keyword}-${trend.platform}`}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{trend.keyword}</Typography>
                          <Chip size="small" label={trend.platform} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatNumber(trend.mention_count)} mencoes - {formatNumber(trend.total_engagement)} engajamentos
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem tendencias.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Oportunidades de calendario</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {upcoming.length ? (
                    upcoming.map((event) => (
                      <Box key={event.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{event.name}</Typography>
                          <Chip size="small" label={event.tier || 'C'} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.date)} - Score {formatNumber(event.score)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem datas relevantes proximas.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Radar relevante</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {matches.length ? (
                    matches.map((match) => (
                      <Box key={match.item_id || match.itemId} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{match.title}</Typography>
                          <Chip size="small" label={`Score ${formatNumber(match.score)}`} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {match.snippet || 'Sem resumo.'}
                        </Typography>
                        {match.url ? (
                          <Button size="small" variant="text" href={match.url} target="_blank" rel="noreferrer">
                            Abrir fonte
                          </Button>
                        ) : null}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem matches relevantes.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary">Oportunidades de IA</Typography>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<IconSparkles size={16} />}
                    onClick={generateOpportunities}
                    disabled={generatingOpportunities}
                  >
                    {generatingOpportunities ? 'Gerando...' : 'Gerar oportunidades'}
                  </Button>
                </Stack>
                <Stack spacing={1}>
                  {opportunities.length ? (
                    opportunities.map((opp) => (
                      <Box key={opp.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{opp.title}</Typography>
                          <Chip size="small" label={opp.priority || 'medium'} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {opp.description || 'Sem descricao.'}
                        </Typography>
                        {opp.suggested_action ? (
                          <Typography variant="caption" color="primary" display="block" sx={{ mt: 1 }}>
                            Acao sugerida: {opp.suggested_action}
                          </Typography>
                        ) : null}
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {opp.source || 'IA'} {opp.confidence ? `- Confianca: ${Math.round(opp.confidence)}%` : ''}
                          </Typography>
                          {opp.status !== 'actioned' && opp.status !== 'dismissed' ? (
                            <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={() => updateOpportunityStatus(opp.id, 'actioned')}>
                                Concluir
                              </Button>
                              <Button size="small" color="inherit" onClick={() => updateOpportunityStatus(opp.id, 'dismissed')}>
                                Dispensar
                              </Button>
                            </Stack>
                          ) : null}
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma oportunidade gerada.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell
      title="Insights"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Radar</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Insights</Typography>
        </Stack>
      }
    >
      {content}
    </AppShell>
  );
}
