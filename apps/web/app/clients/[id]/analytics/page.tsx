'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import {
  IconChartBar, IconSparkles, IconAlertTriangle, IconTrophy,
  IconBrandMeta, IconCalendarEvent, IconTarget, IconCoin,
  IconBulb, IconRefresh, IconTrendingUp, IconTrendingDown,
  IconHeartbeat, IconDna, IconSearch, IconRobot,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthScore = {
  score: number; status: string; statusColor: string;
  breakdown: { label: string; weight: number; score: number; value: string }[];
  client_name: string;
};

type BottleneckAlerts = {
  total: number; critical: number;
  alerts: { briefing_id: string; title: string; current_stage: string; hours_stuck: number; severity: string; severityColor: string; message: string }[];
};

type ProofOfValue = {
  narrative: string;
  data: { briefings: { total: number; completed: number; completion_rate: number }; copies: { total: number }; value: { hours_saved: number; market_value: number } };
};

type BrandVoice = {
  dna: { tone: string[]; personality: string; vocabulary: { preferred: string[]; avoid: string[] }; content_themes: string[]; dos: string[]; donts: string[]; brand_promise: string };
  copies_analyzed: number;
};

type BenchmarkData = {
  metrics: { label: string; client: string; benchmark: string; status: 'above' | 'below'; higherIsBetter: boolean }[];
  overall_position: string; above_benchmark: number; total_metrics: number;
};

type ContentGap = {
  gaps: { gap: string; opportunity: string; format: string; urgency: string; suggested_topics: string[] }[];
  market_context: string; citations: string[];
};

type StrategicBrief = {
  brief: string; target_period: { label: string };
  data_used: { briefings: number; calendar_events: number; ai_opportunities: number };
  provider: string;
};

type RoiData = {
  production: { total_briefings: number; total_copies: number; words_produced: number; completion_rate: number };
  value: { total_market_value: number; retainer_total: number; roi_percent: number | null; value_multiplier: number | null; estimated_hours: number };
};

type PredictiveCalendar = {
  suggestions: { event: string; event_date: string; brief_by_date: string; days_lead_time: number; status: string; relevance_score: number | null }[];
  best_posting_days: string[]; lead_time_summary: { avg_days: number };
  urgent: number;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatAiText(text: string) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:16px 0 6px;font-size:1rem;">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 4px;font-size:0.9rem;">$1</h4>')
    .replace(/^\*\s(.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:4px 0 8px;padding-left:20px">$1</ul>')
    .replace(/\n/g, '<br/>');
}

const positionLabel: Record<string, string> = {
  top_quartile: 'Top 25%', above_average: 'Acima da média', average: 'Na média', below_average: 'Abaixo da média',
};
const positionColor: Record<string, string> = {
  top_quartile: '#13DEB9', above_average: '#5D87FF', average: '#FFAE1F', below_average: '#FA896B',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientAnalyticsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');

  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [alerts, setAlerts] = useState<BottleneckAlerts | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [pov, setPov] = useState<ProofOfValue | null>(null);
  const [povLoading, setPovLoading] = useState(false);
  const [retainerValue, setRetainerValue] = useState('');

  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [brandVoiceLoading, setBrandVoiceLoading] = useState(false);

  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  const [gaps, setGaps] = useState<ContentGap | null>(null);
  const [gapsLoading, setGapsLoading] = useState(false);

  const [brief, setBrief] = useState<StrategicBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const [roi, setRoi] = useState<RoiData | null>(null);
  const [roiLoading, setRoiLoading] = useState(false);

  const [calendar, setCalendar] = useState<PredictiveCalendar | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const wrap = async (fn: () => Promise<void>) => {
    setError('');
    try { await fn(); } catch (e: any) { setError(e?.message || 'Erro ao carregar.'); }
  };

  const loadHealth = () => wrap(async () => {
    setHealthLoading(true);
    setHealthScore(await apiGet<HealthScore>(`/clients/${clientId}/health-score`));
    setHealthLoading(false);
  });

  const loadAlerts = () => wrap(async () => {
    setAlertsLoading(true);
    setAlerts(await apiGet<BottleneckAlerts>(`/clients/${clientId}/bottleneck-alerts`));
    setAlertsLoading(false);
  });

  const loadPov = () => wrap(async () => {
    setPovLoading(true);
    setPov(await apiPost<ProofOfValue>(`/clients/${clientId}/proof-of-value`, {
      retainer_value: retainerValue ? parseFloat(retainerValue) : undefined,
    }));
    setPovLoading(false);
  });

  const loadBrandVoice = () => wrap(async () => {
    setBrandVoiceLoading(true);
    setBrandVoice(await apiGet<BrandVoice>(`/clients/${clientId}/brand-voice`));
    setBrandVoiceLoading(false);
  });

  const loadBenchmark = () => wrap(async () => {
    setBenchmarkLoading(true);
    setBenchmark(await apiGet<BenchmarkData>(`/clients/${clientId}/benchmark`));
    setBenchmarkLoading(false);
  });

  const loadGaps = () => wrap(async () => {
    setGapsLoading(true);
    setGaps(await apiPost<ContentGap>(`/clients/${clientId}/content-gap`, {}));
    setGapsLoading(false);
  });

  const loadBrief = () => wrap(async () => {
    setBriefLoading(true);
    setBrief(await apiPost<StrategicBrief>(`/clients/${clientId}/strategic-brief`, {}));
    setBriefLoading(false);
  });

  const loadRoi = () => wrap(async () => {
    setRoiLoading(true);
    setRoi(await apiGet<RoiData>(`/clients/${clientId}/roi-retainer${retainerValue ? `?retainer_value=${retainerValue}` : ''}`));
    setRoiLoading(false);
  });

  const loadCalendar = () => wrap(async () => {
    setCalendarLoading(true);
    setCalendar(await apiGet<PredictiveCalendar>(`/clients/${clientId}/predictive-calendar`));
    setCalendarLoading(false);
  });

  const tabs = [
    { label: 'Health Score', icon: <IconHeartbeat size={18} /> },
    { label: 'Gargalos', icon: <IconAlertTriangle size={18} /> },
    { label: 'Proof of Value', icon: <IconTrophy size={18} /> },
    { label: 'Tom de Voz', icon: <IconDna size={18} /> },
    { label: 'Benchmark', icon: <IconChartBar size={18} /> },
    { label: 'Content Gap', icon: <IconSearch size={18} /> },
    { label: 'Estrategista', icon: <IconRobot size={18} /> },
    { label: 'ROI Retainer', icon: <IconCoin size={18} /> },
    { label: 'Cal. Preditivo', icon: <IconCalendarEvent size={18} /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconSparkles size={28} stroke={1.5} color="#7c3aed" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Analytics Avancado</Typography>
          <Typography variant="body2" color="text.secondary">
            Inteligência de dados, IA estratégica e métricas de valor.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 48 } }}
      >
        {tabs.map((t, i) => (
          <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ fontSize: '0.8rem' }} />
        ))}
      </Tabs>

      {/* ── TAB 0: Health Score ──────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={healthLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconRefresh size={18} />}
            onClick={loadHealth} disabled={healthLoading}
            sx={{ mb: 3, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
            {healthLoading ? 'Calculando...' : 'Calcular Health Score'}
          </Button>

          {healthScore && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ textAlign: 'center', py: 3 }}>
                  <CardContent>
                    <Typography variant="h1" fontWeight={800} sx={{ color: healthScore.statusColor, fontSize: '5rem' }}>
                      {healthScore.score}
                    </Typography>
                    <Chip label={healthScore.status.toUpperCase()} sx={{ bgcolor: healthScore.statusColor, color: '#fff', fontWeight: 700, mt: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Health Score — últimos 30 dias</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Breakdown</Typography>
                    <Stack spacing={2}>
                      {healthScore.breakdown.map((b, i) => (
                        <Box key={i}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2">{b.label} <Typography component="span" variant="caption" color="text.secondary">({b.weight}%)</Typography></Typography>
                            <Typography variant="body2" fontWeight={700}>{b.value}</Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate" value={b.score}
                            sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': { bgcolor: b.score >= 70 ? '#13DEB9' : b.score >= 50 ? '#FFAE1F' : '#FA896B' } }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* ── TAB 1: Gargalo Alert ─────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={alertsLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconAlertTriangle size={18} />}
            onClick={loadAlerts} disabled={alertsLoading}
            sx={{ mb: 3, bgcolor: '#FA896B', '&:hover': { bgcolor: '#e57c5f' } }}>
            {alertsLoading ? 'Verificando...' : 'Verificar Gargalos'}
          </Button>

          {alerts && (
            <Box>
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h3" fontWeight={800} color="error.main">{alerts.critical}</Typography>
                    <Typography variant="caption" color="text.secondary">Críticos (&gt;72h)</Typography>
                  </CardContent>
                </Card>
                <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h3" fontWeight={800} color="warning.main">{alerts.total}</Typography>
                    <Typography variant="caption" color="text.secondary">Total de Gargalos</Typography>
                  </CardContent>
                </Card>
              </Stack>
              {alerts.total === 0 ? (
                <Alert severity="success">Nenhum gargalo detectado. Todos os briefings estão fluindo normalmente.</Alert>
              ) : (
                <Stack spacing={2}>
                  {alerts.alerts.map((a) => (
                    <Card key={a.briefing_id} variant="outlined" sx={{ borderLeft: `4px solid ${a.severityColor}` }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>{a.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Etapa atual: <strong>{a.current_stage}</strong> · {a.hours_stuck}h parado
                            </Typography>
                          </Box>
                          <Chip label={a.severity.toUpperCase()} size="small" sx={{ bgcolor: a.severityColor, color: '#fff', fontWeight: 700 }} />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ── TAB 2: Proof of Value ────────────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
            <TextField
              label="Valor do Retainer (R$)" type="number" size="small"
              value={retainerValue} onChange={(e) => setRetainerValue(e.target.value)}
              placeholder="Ex: 5000" sx={{ width: 220 }}
            />
            <Button variant="contained" startIcon={povLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconTrophy size={18} />}
              onClick={loadPov} disabled={povLoading}
              sx={{ bgcolor: '#FFAE1F', color: '#000', '&:hover': { bgcolor: '#e09900' } }}>
              {povLoading ? 'Gerando...' : 'Gerar Proof of Value'}
            </Button>
          </Stack>

          {pov && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={2}>
                  <Card variant="outlined" sx={{ textAlign: 'center', bgcolor: 'rgba(19,222,185,0.05)' }}>
                    <CardContent>
                      <Typography variant="h4" fontWeight={800} color="#13DEB9">
                        {pov.data.briefings.completion_rate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Taxa de Conclusão</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography variant="h4" fontWeight={800}>{pov.data.copies.total}</Typography>
                      <Typography variant="caption" color="text.secondary">Peças Produzidas</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ textAlign: 'center', bgcolor: 'rgba(255,102,0,0.05)' }}>
                    <CardContent>
                      <Typography variant="h4" fontWeight={800} color="#ff6600">
                        R$ {pov.data.value.market_value.toLocaleString('pt-BR')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Valor de Mercado Estimado</Typography>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <IconTrophy size={20} color="#FFAE1F" />
                      <Typography variant="h6" fontWeight={700}>Relatório Executivo</Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ lineHeight: 1.8 }}
                      dangerouslySetInnerHTML={{ __html: formatAiText(pov.narrative) }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* ── TAB 3: Brand Voice DNA ───────────────────────────────────────────── */}
      {tab === 3 && (
        <Box>
          <Button variant="contained" startIcon={brandVoiceLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconDna size={18} />}
            onClick={loadBrandVoice} disabled={brandVoiceLoading}
            sx={{ mb: 3, bgcolor: '#5D87FF', '&:hover': { bgcolor: '#4d77ef' } }}>
            {brandVoiceLoading ? 'Analisando copies...' : 'Extrair DNA de Marca'}
          </Button>

          {brandVoice && brandVoice.dna && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Tom de Voz</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {(brandVoice.dna.tone || []).map((t, i) => (
                        <Chip key={i} label={t} size="small" sx={{ bgcolor: '#5D87FF', color: '#fff' }} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Personalidade da Marca</Typography>
                    <Typography variant="body2">{brandVoice.dna.personality}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Vocabulário</Typography>
                    <Typography variant="caption" color="success.main" fontWeight={700}>USAR:</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
                      {(brandVoice.dna.vocabulary?.preferred || []).map((w, i) => (
                        <Chip key={i} label={w} size="small" sx={{ bgcolor: 'rgba(19,222,185,0.15)', color: '#13DEB9', fontSize: '0.7rem' }} />
                      ))}
                    </Stack>
                    <Typography variant="caption" color="error.main" fontWeight={700}>EVITAR:</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {(brandVoice.dna.vocabulary?.avoid || []).map((w, i) => (
                        <Chip key={i} label={w} size="small" sx={{ bgcolor: 'rgba(250,137,107,0.15)', color: '#FA896B', fontSize: '0.7rem' }} />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Promessa da Marca</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#ff6600' }}>
                      "{brandVoice.dna.brand_promise}"
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ mb: 1 }}>✓ Fazer</Typography>
                    <Stack spacing={0.5}>
                      {(brandVoice.dna.dos || []).map((d, i) => (
                        <Typography key={i} variant="body2">• {d}</Typography>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} color="error.main" sx={{ mb: 1 }}>✗ Evitar</Typography>
                    <Stack spacing={0.5}>
                      {(brandVoice.dna.donts || []).map((d, i) => (
                        <Typography key={i} variant="body2">• {d}</Typography>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">
                  Baseado em {brandVoice.copies_analyzed} copies aprovadas.
                </Typography>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* ── TAB 4: Benchmark ─────────────────────────────────────────────────── */}
      {tab === 4 && (
        <Box>
          <Button variant="contained" startIcon={benchmarkLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconChartBar size={18} />}
            onClick={loadBenchmark} disabled={benchmarkLoading}
            sx={{ mb: 3, bgcolor: '#13DEB9', color: '#000', '&:hover': { bgcolor: '#0fc9a8' } }}>
            {benchmarkLoading ? 'Comparando...' : 'Comparar com Benchmark'}
          </Button>

          {benchmark && (
            <Box>
              <Card variant="outlined" sx={{ mb: 3, bgcolor: `${positionColor[benchmark.overall_position]}15` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={800} sx={{ color: positionColor[benchmark.overall_position] }}>
                    {positionLabel[benchmark.overall_position]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {benchmark.above_benchmark} de {benchmark.total_metrics} métricas acima da média
                  </Typography>
                </CardContent>
              </Card>
              <Stack spacing={2}>
                {benchmark.metrics.map((m, i) => (
                  <Card key={i} variant="outlined" sx={{ borderLeft: `4px solid ${m.status === 'above' ? '#13DEB9' : '#FA896B'}` }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2">{m.label}</Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Você</Typography>
                            <Typography variant="body2" fontWeight={700}>{m.client}</Typography>
                          </Box>
                          <Divider orientation="vertical" flexItem />
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Média</Typography>
                            <Typography variant="body2">{m.benchmark}</Typography>
                          </Box>
                          {m.status === 'above'
                            ? <IconTrendingUp size={20} color="#13DEB9" />
                            : <IconTrendingDown size={20} color="#FA896B" />}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* ── TAB 5: Content Gap ───────────────────────────────────────────────── */}
      {tab === 5 && (
        <Box>
          <Button variant="contained" startIcon={gapsLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconSearch size={18} />}
            onClick={loadGaps} disabled={gapsLoading}
            sx={{ mb: 3, bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}>
            {gapsLoading ? 'Pesquisando tendências...' : 'Detectar Content Gaps'}
          </Button>

          {gaps && (
            <Box>
              <Stack spacing={2} sx={{ mb: 3 }}>
                {(gaps.gaps || []).map((g, i) => (
                  <Card key={i} variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{g.gap}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip label={g.format} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          <Chip label={g.urgency} size="small" sx={{
                            bgcolor: g.urgency === 'alta' ? '#FA896B' : g.urgency === 'média' ? '#FFAE1F' : '#5D87FF',
                            color: '#fff', fontSize: '0.7rem',
                          }} />
                        </Stack>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{g.opportunity}</Typography>
                      {g.suggested_topics?.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {g.suggested_topics.map((t, j) => (
                            <Chip key={j} label={t} size="small" sx={{ bgcolor: 'rgba(255,102,0,0.1)', color: '#ff6600', fontSize: '0.7rem' }} />
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              {gaps.citations?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Fontes: </Typography>
                  {gaps.citations.map((c, i) => (
                    <Typography key={i} variant="caption" sx={{ mr: 1 }}>
                      <a href={c} target="_blank" rel="noreferrer" style={{ color: '#ff6600' }}>[{i + 1}]</a>
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* ── TAB 6: Estrategista Virtual ──────────────────────────────────────── */}
      {tab === 6 && (
        <Box>
          <Button variant="contained" startIcon={briefLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconRobot size={18} />}
            onClick={loadBrief} disabled={briefLoading}
            sx={{ mb: 3, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
            {briefLoading ? 'Elaborando estratégia...' : 'Gerar Planejamento Estratégico'}
          </Button>

          {brief && (
            <Card variant="outlined" sx={{ borderColor: '#7c3aed', borderWidth: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <IconRobot size={22} color="#7c3aed" />
                  <Typography variant="h6" fontWeight={700} color="#7c3aed">Planejamento — {brief.target_period.label}</Typography>
                  <Chip label={brief.provider.toUpperCase()} size="small" sx={{ bgcolor: '#7c3aed', color: '#fff', fontSize: '0.65rem' }} />
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip label={`${brief.data_used.briefings} briefings`} size="small" variant="outlined" />
                  <Chip label={`${brief.data_used.calendar_events} eventos`} size="small" variant="outlined" />
                  <Chip label={`${brief.data_used.ai_opportunities} oportunidades`} size="small" variant="outlined" />
                </Stack>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ lineHeight: 1.9 }}
                  dangerouslySetInnerHTML={{ __html: formatAiText(brief.brief) }}
                />
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ── TAB 7: ROI de Retainer ───────────────────────────────────────────── */}
      {tab === 7 && (
        <Box>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
            <TextField
              label="Retainer Mensal (R$)" type="number" size="small"
              value={retainerValue} onChange={(e) => setRetainerValue(e.target.value)}
              placeholder="Ex: 8000" sx={{ width: 220 }}
            />
            <Button variant="contained" startIcon={roiLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconCoin size={18} />}
              onClick={loadRoi} disabled={roiLoading}
              sx={{ bgcolor: '#13DEB9', color: '#000', '&:hover': { bgcolor: '#0fc9a8' } }}>
              {roiLoading ? 'Calculando...' : 'Calcular ROI'}
            </Button>
          </Stack>

          {roi && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={800}>{roi.production.total_briefings}</Typography>
                    <Typography variant="caption" color="text.secondary">Briefings</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={800}>{roi.production.total_copies}</Typography>
                    <Typography variant="caption" color="text.secondary">Copies Produzidas</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Card variant="outlined" sx={{ textAlign: 'center' }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={800}>{roi.value.estimated_hours}h</Typography>
                    <Typography variant="caption" color="text.secondary">Horas Entregues</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Card variant="outlined" sx={{ textAlign: 'center', bgcolor: 'rgba(19,222,185,0.05)' }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={800} color="#13DEB9">
                      R$ {roi.value.total_market_value.toLocaleString('pt-BR')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Valor de Mercado</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {roi.value.roi_percent !== null && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ textAlign: 'center', bgcolor: roi.value.roi_percent >= 0 ? 'rgba(19,222,185,0.05)' : 'rgba(250,137,107,0.05)' }}>
                      <CardContent>
                        <Typography variant="h3" fontWeight={800} color={roi.value.roi_percent >= 0 ? '#13DEB9' : '#FA896B'}>
                          {roi.value.roi_percent >= 0 ? '+' : ''}{roi.value.roi_percent}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">ROI do Retainer</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ textAlign: 'center' }}>
                      <CardContent>
                        <Typography variant="h3" fontWeight={800} color="#ff6600">{roi.value.value_multiplier}x</Typography>
                        <Typography variant="body2" color="text.secondary">Multiplicador de Valor</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Paga R$ {roi.value.retainer_total.toLocaleString('pt-BR')} — recebe {roi.value.value_multiplier}x em valor
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* ── TAB 8: Calendário Preditivo ──────────────────────────────────────── */}
      {tab === 8 && (
        <Box>
          <Button variant="contained" startIcon={calendarLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <IconCalendarEvent size={18} />}
            onClick={loadCalendar} disabled={calendarLoading}
            sx={{ mb: 3, bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}>
            {calendarLoading ? 'Analisando padrões...' : 'Gerar Calendário Preditivo'}
          </Button>

          {calendar && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography variant="h4" fontWeight={800}>{calendar.lead_time_summary.avg_days} dias</Typography>
                      <Typography variant="caption" color="text.secondary">Lead Time Médio</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Typography variant="h4" fontWeight={800} color="error.main">{calendar.urgent}</Typography>
                      <Typography variant="caption" color="text.secondary">Urgentes (prazo vencendo)</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined" sx={{ textAlign: 'center' }}>
                    <CardContent>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} justifyContent="center">
                        {calendar.best_posting_days.map((d, i) => (
                          <Chip key={i} label={d} size="small" sx={{ bgcolor: '#5D87FF', color: '#fff' }} />
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Melhores dias para briefing</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Stack spacing={2}>
                {calendar.suggestions.map((s, i) => (
                  <Card key={i} variant="outlined" sx={{ borderLeft: `4px solid ${s.status === 'urgent' ? '#FA896B' : '#5D87FF'}` }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>{s.event}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Evento: <strong>{s.event_date}</strong> · Briefar até: <strong style={{ color: s.status === 'urgent' ? '#FA896B' : undefined }}>{s.brief_by_date}</strong>
                          </Typography>
                        </Box>
                        {s.status === 'urgent' && (
                          <Chip label="URGENTE" size="small" sx={{ bgcolor: '#FA896B', color: '#fff', fontWeight: 700 }} />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {calendar.suggestions.length === 0 && (
                  <Alert severity="info">Nenhum evento mapeado nos próximos 30 dias. Adicione eventos ao calendário do cliente.</Alert>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
