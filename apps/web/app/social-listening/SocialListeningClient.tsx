'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
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
import Chart from '@/components/charts/Chart';
import { IconRefresh, IconPlus, IconTrash } from '@tabler/icons-react';

type ClientRow = {
  id: string;
  name: string;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  segment_primary?: string | null;
};

type KeywordRow = {
  id: string;
  keyword: string;
  category?: string | null;
  client_id?: string | null;
  is_active: boolean;
};

type MentionRow = {
  id: string;
  platform: string;
  keyword: string;
  content: string;
  author?: string | null;
  url?: string | null;
  sentiment?: string | null;
  engagement_likes?: number | null;
  engagement_comments?: number | null;
  engagement_shares?: number | null;
  engagement_views?: number | null;
  published_at?: string | null;
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

type SocialListeningClientProps = {
  clientId?: string;
  noShell?: boolean;
  embedded?: boolean;
};

const PLATFORM_OPTIONS = [
  { value: '', label: 'Todas plataformas' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'reddit', label: 'Reddit' },
];

const SENTIMENT_OPTIONS = [
  { value: '', label: 'Todos sentimentos' },
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
];

const KPI_LABELS: Record<string, string> = {
  impressions: 'Impressoes',
  reach: 'Alcance',
  engagements: 'Engajamentos',
  engagement_rate: 'Taxa de engajamento',
  clicks: 'Cliques',
  ctr: 'CTR',
  cpc: 'CPC',
  cpm: 'CPM',
  conversions: 'Conversoes',
  cost: 'Custo',
};

const RATE_METRICS = new Set(['ctr', 'engagement_rate']);
const CURRENCY_METRICS = new Set(['cpc', 'cpm', 'cost']);

function formatNumber(value?: number | null) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(Number(value));
}

function formatCurrency(value?: number | null) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

function formatKpiValue(metric: string, value: number) {
  if (!Number.isFinite(value)) return '--';
  if (RATE_METRICS.has(metric)) {
    const display = value > 1 ? value : value * 100;
    return `${display.toFixed(2)}%`;
  }
  if (CURRENCY_METRICS.has(metric)) {
    return formatCurrency(value);
  }
  return formatNumber(value);
}

function pickTop<T extends { score?: number }>(items?: T[]) {
  if (!items || items.length === 0) return null;
  return [...items].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))[0] || null;
}

function getSentimentLabel(sentiment?: string | null) {
  if (sentiment === 'positive') return 'Positivo';
  if (sentiment === 'negative') return 'Negativo';
  if (sentiment === 'neutral') return 'Neutro';
  return 'Indefinido';
}

export default function SocialListeningClient({ clientId, noShell, embedded }: SocialListeningClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedClientId = clientId || searchParams.get('clientId') || '';
  const isLocked = Boolean(lockedClientId);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [mentions, setMentions] = useState<MentionRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [stats, setStats] = useState<StatsResponse>({});
  const [reporteiItems, setReporteiItems] = useState<ReporteiInsight[]>([]);
  const [reporteiUpdatedAt, setReporteiUpdatedAt] = useState<string | null>(null);
  const [reporteiLoading, setReporteiLoading] = useState(false);
  const [reporteiError, setReporteiError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [collecting, setCollecting] = useState(false);

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

  const loadStats = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const response = await apiGet<StatsResponse>(`/social-listening/stats?clientId=${selectedClient.id}`);
      setStats(response || {});
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar estatisticas.');
    }
  }, [selectedClient]);

  const loadKeywords = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const response = await apiGet<KeywordRow[]>(
        `/social-listening/keywords?clientId=${selectedClient.id}`
      );
      setKeywords(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar keywords.');
    }
  }, [selectedClient]);

  const loadMentions = useCallback(async () => {
    if (!selectedClient) return;
    const qs = new URLSearchParams();
    qs.set('clientId', selectedClient.id);
    if (platformFilter) qs.set('platform', platformFilter);
    if (sentimentFilter) qs.set('sentiment', sentimentFilter);
    if (search) qs.set('search', search);
    if (keywordFilter) qs.set('keyword', keywordFilter);

    try {
      const response = await apiGet<{ mentions: MentionRow[] }>(
        `/social-listening/mentions?${qs.toString()}`
      );
      setMentions(response?.mentions || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar mencoes.');
    }
  }, [keywordFilter, platformFilter, search, selectedClient, sentimentFilter]);

  const loadTrends = useCallback(async () => {
    if (!selectedClient) return;
    try {
      const response = await apiGet<TrendRow[]>(`/social-listening/trends?clientId=${selectedClient.id}`);
      setTrends(response || []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar tendencias.');
    }
  }, [selectedClient]);

  const loadReportei = useCallback(async () => {
    if (!selectedClient) return;
    setReporteiLoading(true);
    setReporteiError('');
    try {
      const response = await apiGet<ReporteiResponse>(
        `/clients/${selectedClient.id}/insights/reportei`
      );
      setReporteiItems(response?.items || []);
      setReporteiUpdatedAt(response?.updated_at || null);
    } catch (err: any) {
      setReporteiItems([]);
      setReporteiUpdatedAt(null);
      setReporteiError(err?.message || 'Falha ao carregar Reportei.');
    } finally {
      setReporteiLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (isLocked && lockedClientId) {
      loadClientDetail(lockedClientId);
    } else {
      loadClients();
    }
  }, [isLocked, lockedClientId, loadClients, loadClientDetail]);

  useEffect(() => {
    if (!selectedClient) return;
    loadStats();
    loadKeywords();
    loadMentions();
    loadTrends();
    loadReportei();
  }, [selectedClient, loadStats, loadKeywords, loadMentions, loadTrends, loadReportei]);

  const handleAddKeyword = async () => {
    if (!selectedClient) return;
    if (!keywordInput.trim()) return;

    setError('');
    setSuccess('');
    try {
      await apiPost('/social-listening/keywords', {
        clientId: selectedClient.id,
        keyword: keywordInput.trim(),
        category: categoryInput.trim() || null,
      });
      setKeywordInput('');
      setCategoryInput('');
      setSuccess('Keyword adicionada.');
      await loadKeywords();
    } catch (err: any) {
      setError(err?.message || 'Falha ao adicionar keyword.');
    }
  };

  const toggleKeyword = async (keyword: KeywordRow) => {
    setError('');
    setSuccess('');
    try {
      await apiPatch(`/social-listening/keywords/${keyword.id}`, { is_active: !keyword.is_active });
      await loadKeywords();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar keyword.');
    }
  };

  const deleteKeyword = async (keyword: KeywordRow) => {
    setError('');
    setSuccess('');
    try {
      await apiDelete(`/social-listening/keywords/${keyword.id}`);
      await loadKeywords();
    } catch (err: any) {
      setError(err?.message || 'Falha ao remover keyword.');
    }
  };

  const handleCollect = async () => {
    if (!selectedClient) return;
    setCollecting(true);
    setError('');
    setSuccess('');
    try {
      await apiPost('/social-listening/collect', { clientId: selectedClient.id });
      setSuccess('Coleta iniciada.');
      await loadMentions();
      await loadStats();
      await loadTrends();
    } catch (err: any) {
      setError(err?.message || 'Falha ao coletar mencoes.');
    } finally {
      setCollecting(false);
    }
  };

  const topKeywords = useMemo(() => stats.top_keywords || [], [stats]);
  const platforms = useMemo(() => stats.platforms || [], [stats]);
  const summary = stats.summary || {};

  if (loading && clients.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando Social Listening...
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

  const platformChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar' },
    xaxis: { categories: platforms.map((p) => p.platform) },
    colors: ['#49beff'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  };
  const platformChartSeries = [{ name: 'Total', data: platforms.map((p) => p.total) }];

  const keywordChartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar' },
    xaxis: { categories: topKeywords.map((kw) => kw.keyword) },
    colors: ['#5d87ff'],
    plotOptions: { bar: { borderRadius: 4 } },
  };
  const keywordChartSeries = [{ name: 'Mencoes', data: topKeywords.map((kw) => kw.total) }];

  const content = (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="h4">Social Listening</Typography>
        <Typography variant="body2" color="text.secondary">
          Monitoramento em tempo real das conversas e tendencias para cada cliente.
        </Typography>
      </Box>

      {error ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {success ? (
        <Card variant="outlined">
          <CardContent>
            <Typography color="success.main">{success}</Typography>
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={2}>
        {[
          { label: 'Total 7 dias', value: summary.total },
          { label: 'Positivas', value: summary.positive },
          { label: 'Neutras', value: summary.neutral },
          { label: 'Negativas', value: summary.negative },
          { label: 'Sentimento médio', value: `${formatNumber(summary.avg_score)}%` },
        ].map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {metric.label}
                </Typography>
                <Typography variant="h5">{metric.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      {hasSentimentData ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>Sentimento</Typography>
                <Chart options={sentimentChartOptions} series={sentimentChartSeries} type="donut" height={260} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>Top Keywords</Typography>
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
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1 }}>Por Plataforma</Typography>
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

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="text.secondary">Filtros</Typography>
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
                  if (match) router.replace(`/social-listening?clientId=${match.id}`);
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
              <TextField select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} size="small">
                {PLATFORM_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select value={sentimentFilter} onChange={(event) => setSentimentFilter(event.target.value)} size="small">
                {SENTIMENT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                placeholder="Buscar termo ou autor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button variant="contained" startIcon={<IconRefresh size={16} />} onClick={handleCollect} disabled={collecting}>
                {collecting ? 'Coletando...' : 'Atualizar'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary">Reportei Performance</Typography>
            <Typography variant="caption" color="text.secondary">
              {reporteiUpdatedAt ? `Atualizado em ${formatDate(reporteiUpdatedAt)}` : 'Sem atualização recente'}
            </Typography>
          </Stack>

          {reporteiError ? <Typography color="error">{reporteiError}</Typography> : null}

          {reporteiLoading ? (
            <Typography variant="body2" color="text.secondary">Carregando dados do Reportei...</Typography>
          ) : reporteiItems.length ? (
            <Grid container spacing={2}>
              {reporteiItems.map((item, index) => {
                const payload = item.payload || {};
                const topFormat = pickTop(payload.by_format);
                const topTag = pickTop(payload.by_tag);
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

                        <Stack spacing={1} sx={{ mb: 2 }}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Top formato</Typography>
                            <Typography variant="caption">{topFormat?.format || 'N/A'}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Top tag</Typography>
                            <Typography variant="caption">{topTag?.tag || 'N/A'}</Typography>
                          </Stack>
                        </Stack>

                        {kpis.length ? (
                          <Stack spacing={1} sx={{ mb: 2 }}>
                            {kpis.map((kpi) => (
                              <Chip key={`${item.platform}-${kpi.metric}`} size="small" label={`${KPI_LABELS[kpi.metric] || kpi.metric}: ${formatKpiValue(kpi.metric, kpi.value)}`} />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">Sem KPIs disponíveis.</Typography>
                        )}

                        {editorial.length ? (
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">Insights:</Typography>
                            {editorial.map((line, idx) => (
                              <Typography key={`${item.platform}-insight-${idx}`} variant="caption" color="text.secondary">
                                • {line}
                              </Typography>
                            ))}
                          </Stack>
                        ) : null}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">Sem dados do Reportei para este cliente.</Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Keywords ativas</Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="Nova keyword"
                    value={keywordInput}
                    onChange={(event) => setKeywordInput(event.target.value)}
                    placeholder="Ex: mobilidade"
                  />
                  <TextField
                    label="Categoria"
                    value={categoryInput}
                    onChange={(event) => setCategoryInput(event.target.value)}
                    placeholder="Ex: setor"
                  />
                  <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={handleAddKeyword}>
                    Adicionar keyword
                  </Button>
                </Stack>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {keywords.length ? (
                    keywords.map((keyword) => (
                      <Box key={keyword.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{keyword.keyword}</Typography>
                          <Chip size="small" label={keyword.category || 'geral'} />
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button size="small" variant="text" onClick={() => toggleKeyword(keyword)}>
                            {keyword.is_active ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button size="small" color="error" variant="text" startIcon={<IconTrash size={14} />} onClick={() => deleteKeyword(keyword)}>
                            Remover
                          </Button>
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Nenhuma keyword ativa.</Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">Tendências (24h)</Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {trends.length ? (
                    trends.map((trend) => (
                      <Box key={`${trend.keyword}-${trend.platform}`}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{trend.keyword}</Typography>
                          <Chip size="small" label={trend.platform} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatNumber(trend.mention_count)} menções • {formatNumber(trend.total_engagement)} engajamentos
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">Sem tendências disponíveis.</Typography>
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
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Menções recentes</Typography>
                <TextField
                  select
                  size="small"
                  value={keywordFilter}
                  onChange={(event) => setKeywordFilter(event.target.value)}
                >
                  <MenuItem value="">Todas keywords</MenuItem>
                  {keywords.map((keyword) => (
                    <MenuItem key={keyword.id} value={keyword.keyword}>
                      {keyword.keyword}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack spacing={1}>
                {mentions.length ? (
                  mentions.map((mention) => (
                    <Box key={mention.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{mention.author || 'Anônimo'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {mention.platform} • {mention.keyword}
                          </Typography>
                        </Box>
                        <Chip size="small" label={getSentimentLabel(mention.sentiment)} />
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {mention.content}
                      </Typography>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }} alignItems={{ xs: 'flex-start', md: 'center' }}>
                        <Chip size="small" label={`❤ ${formatNumber(mention.engagement_likes)}`} />
                        <Chip size="small" label={`💬 ${formatNumber(mention.engagement_comments)}`} />
                        <Chip size="small" label={`↗ ${formatNumber(mention.engagement_shares)}`} />
                        <Chip size="small" label={`▶ ${formatNumber(mention.engagement_views)}`} />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(mention.published_at)}
                        </Typography>
                      </Stack>
                      {mention.url ? (
                        <Button size="small" variant="text" href={mention.url} target="_blank" rel="noreferrer">
                          Abrir fonte
                        </Button>
                      ) : null}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">Nenhuma menção encontrada.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );

  if (noShell) {
    return content;
  }

  return (
    <AppShell
      title="Social Listening"
      topbarLeft={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Radar</Typography>
          <Typography variant="body2" color="text.secondary">/</Typography>
          <Typography variant="body2" fontWeight={600}>Social Listening</Typography>
        </Stack>
      }
    >
      {content}
    </AppShell>
  );
}
