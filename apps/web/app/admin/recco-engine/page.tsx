'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import { apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import {
  IconBrain,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCoin,
  IconLayoutGrid,
  IconRefresh,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ScoreBreakdown = Record<string, number>;

type RecommendedFormat = {
  format_id: string;
  format_name: string;
  platform: string;
  production_type: string;
  recommendation_score: number;
  priority: 'must_have' | 'high' | 'medium' | 'nice_to_have';
  quantity: number;
  estimated_cost_per_unit: number;
  estimated_cost_total: number;
  estimated_hours_per_unit: number;
  estimated_hours_total: number;
  estimated_delivery_date: string;
  recommendation_reasons: string[];
  score_breakdown: ScoreBreakdown;
};

type Summary = {
  total_formats: number;
  total_estimated_cost: number;
  total_estimated_hours: number;
  total_estimated_days: number;
  avg_ml_performance_score: number;
  avg_measurability_score: number;
  avg_recommendation_score: number;
  coverage: { platforms: string[]; production_types: string[]; funnel_stages: string[] };
};

type ProcessingPhase = { phase: string; duration_ms: number; details: any };

type ReccoResult = {
  id: string;
  recommended_formats: RecommendedFormat[];
  summary: Summary;
  briefing: { original_text: string; extracted_parameters: Record<string, any> };
  warnings: string[];
  suggestions: string[];
  processing_log: ProcessingPhase[];
  created_at: string;
  client?: { id?: string | null; name?: string | null; segment_primary?: string };
};

// ── Constants ────────────────────────────────────────────────────────────────

const OBJECTIVES = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'conversion', label: 'Conversão' },
  { value: 'retention', label: 'Retenção' },
];

const PRODUCTION_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'midia-on', label: 'Mídia On' },
  { value: 'midia-off', label: 'Mídia Off' },
  { value: 'eventos-ativacoes', label: 'Eventos & Ativações' },
];

const PLATFORM_OPTIONS = ['Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'Facebook', 'Google', 'Twitter/X'];

const PRIORITY_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  must_have: { label: 'Must Have', color: 'error' },
  high: { label: 'Alto', color: 'warning' },
  medium: { label: 'Médio', color: 'info' },
  nice_to_have: { label: 'Opcional', color: 'default' },
};

const SCORE_LABELS: Record<string, string> = {
  ml_performance: 'ML Performance',
  measurability: 'Mensurabilidade',
  cost_efficiency: 'Custo-eficiência',
  timeline_fit: 'Prazo',
  audience_fit: 'Audiência',
  objective_alignment: 'Alinhamento obj.',
  reusability: 'Reusabilidade',
  market_trend: 'Tendência',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(v: number): string {
  if (v >= 80) return '#16a34a';
  if (v >= 60) return '#2563eb';
  if (v >= 40) return '#d97706';
  return '#dc2626';
}

function fmtBrl(v: number | null | undefined): string {
  if (v == null) return '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

// ── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ value }: { value: number }) {
  const color = scoreColor(value);
  return (
    <Box
      sx={{
        width: 56, height: 56, borderRadius: '50%',
        border: `3px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 800, color, fontSize: '0.85rem' }}>
        {Math.round(value)}
      </Typography>
    </Box>
  );
}

// ── Score Breakdown ───────────────────────────────────────────────────────────

function ScoreBreakdownPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <Stack spacing={0.5}>
      {Object.entries(breakdown).map(([key, val]) => (
        <Box key={key}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {SCORE_LABELS[key] || key}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: scoreColor(val) }}>
              {Math.round(val)}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={val}
            sx={{
              height: 3, borderRadius: 2, bgcolor: 'grey.100',
              '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: scoreColor(val) },
            }}
          />
        </Box>
      ))}
    </Stack>
  );
}

// ── Format Card ───────────────────────────────────────────────────────────────

function FormatCard({ fmt, index }: { fmt: RecommendedFormat; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[fmt.priority] || { label: fmt.priority, color: 'default' as const };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Score ring */}
          <ScoreRing value={fmt.recommendation_score} />

          {/* Main content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.5}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {index + 1}. {fmt.format_name}
                </Typography>
                <Chip size="small" label={priority.label} color={priority.color} sx={{ height: 18, fontSize: '0.62rem' }} />
              </Stack>
              <IconButton size="small" onClick={() => setExpanded((v) => !v)}>
                {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap">
              <Chip size="small" label={fmt.platform} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
              <Chip size="small" label={fmt.production_type} variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />
              {fmt.quantity > 1 && (
                <Chip size="small" label={`×${fmt.quantity}`} sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'primary.lighter', color: 'primary.main' }} />
              )}
            </Stack>

            {/* Quick stats */}
            <Stack direction="row" spacing={3} sx={{ mt: 1 }} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary">Custo est.</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtBrl(fmt.estimated_cost_total)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Horas est.</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtNum(fmt.estimated_hours_total)}h</Typography>
              </Box>
              {fmt.estimated_delivery_date && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Entrega</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {new Date(fmt.estimated_delivery_date).toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Expandable detail */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1.5 }} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                RAZÕES DA RECOMENDAÇÃO
              </Typography>
              <Stack spacing={0.5}>
                {(fmt.recommendation_reasons || []).map((r, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {r}</Typography>
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                BREAKDOWN DO SCORE
              </Typography>
              {fmt.score_breakdown && Object.keys(fmt.score_breakdown).length > 0 ? (
                <ScoreBreakdownPanel breakdown={fmt.score_breakdown} />
              ) : (
                <Typography variant="caption" color="text.secondary">Não disponível</Typography>
              )}
            </Grid>
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReccoEnginePage() {
  const [briefingText, setBriefingText] = useState('');
  const [objective, setObjective] = useState('awareness');
  const [productionType, setProductionType] = useState('');
  const [budgetTotal, setBudgetTotal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReccoResult | null>(null);
  const [showLog, setShowLog] = useState(false);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleRun = async () => {
    if (!briefingText.trim()) { setError('Insira o texto do briefing.'); return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, any> = {
        briefing_text: briefingText.trim(),
        objective,
      };
      if (selectedPlatforms.length > 0) body.platforms = selectedPlatforms;
      if (productionType) body.production_type = productionType;
      if (budgetTotal) body.budget_total = Number(budgetTotal);
      if (deadline) body.deadline = deadline;
      if (clientName.trim()) body.client_name = clientName.trim();

      const res = await apiPost<ReccoResult>('/recommendations/enxoval', body);
      setResult(res);
    } catch (e: any) {
      setError(e?.message || 'Erro ao chamar o motor de recomendação.');
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.summary;
  const totalMs = result?.processing_log?.reduce((s, p) => s + p.duration_ms, 0) ?? 0;

  return (
    <AppShell title="Recco Engine">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <AdminSubmenu value="recco-engine" />

        {/* Header */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconBrain size={24} color="#E85219" />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Motor de Recomendação</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Teste o Enxoval Engine — scoring ML de formatos por objetivo, budget e prazo
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={3}>
          {/* ── Left: Form ── */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, position: 'sticky', top: 80 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Parâmetros do briefing</Typography>

                <Stack spacing={2}>
                  <TextField
                    label="Texto do briefing *"
                    multiline
                    minRows={5}
                    fullWidth
                    size="small"
                    placeholder="Descreva a campanha, objetivo, produto, público-alvo, datas relevantes..."
                    value={briefingText}
                    onChange={(e) => setBriefingText(e.target.value)}
                  />

                  <FormControl size="small" fullWidth>
                    <InputLabel>Objetivo</InputLabel>
                    <Select label="Objetivo" value={objective} onChange={(e) => setObjective(e.target.value)}>
                      {OBJECTIVES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <InputLabel>Tipo de produção</InputLabel>
                    <Select label="Tipo de produção" value={productionType} onChange={(e) => setProductionType(e.target.value)}>
                      {PRODUCTION_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </Select>
                  </FormControl>

                  {/* Platform chips */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                      Plataformas (opcional)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {PLATFORM_OPTIONS.map((p) => (
                        <Chip
                          key={p}
                          size="small"
                          label={p}
                          onClick={() => togglePlatform(p)}
                          color={selectedPlatforms.includes(p) ? 'primary' : 'default'}
                          variant={selectedPlatforms.includes(p) ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      label="Budget total"
                      size="small"
                      type="number"
                      value={budgetTotal}
                      onChange={(e) => setBudgetTotal(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Deadline"
                      size="small"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>

                  <TextField
                    label="Cliente (opcional)"
                    size="small"
                    fullWidth
                    placeholder="Nome do cliente"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />

                  {error && <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{error}</Alert>}

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleRun}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <IconSparkles size={16} />}
                    sx={{ borderRadius: 2 }}
                  >
                    {loading ? 'Gerando recomendação...' : 'Gerar Enxoval'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Right: Results ── */}
          <Grid size={{ xs: 12, md: 8 }}>
            {!result && !loading && (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
                <IconLayoutGrid size={48} stroke={1} color="#cbd5e1" />
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1.5 }}>
                  Preencha os parâmetros e clique em Gerar Enxoval
                </Typography>
              </Stack>
            )}

            {loading && (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Analisando briefing e calculando scores...
                </Typography>
              </Stack>
            )}

            {result && !loading && (
              <Stack spacing={2.5}>
                {/* ── Summary stats ── */}
                <Grid container spacing={2}>
                  {[
                    { label: 'Formatos', value: summary?.total_formats ?? 0, icon: <IconLayoutGrid size={18} />, color: '#6366f1' },
                    { label: 'Score médio', value: fmtNum(summary?.avg_recommendation_score, 1), icon: <IconTarget size={18} />, color: scoreColor(summary?.avg_recommendation_score ?? 0) },
                    { label: 'Custo total est.', value: fmtBrl(summary?.total_estimated_cost), icon: <IconCoin size={18} />, color: '#d97706' },
                    { label: 'Horas totais', value: `${fmtNum(summary?.total_estimated_hours)}h`, icon: <IconClock size={18} />, color: '#2563eb' },
                  ].map(({ label, value, icon, color }) => (
                    <Grid size={{ xs: 6, md: 3 }} key={label}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" alignItems="center" spacing={1.25}>
                            <Box sx={{ color, opacity: 0.9 }}>{icon}</Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* ML + measurability averages */}
                {(summary?.avg_ml_performance_score || summary?.avg_measurability_score) && (
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Grid container spacing={3} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>SCORES MÉDIOS DO ENXOVAL</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 4 }}>
                          <Typography variant="caption" color="text.secondary">ML Performance</Typography>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress variant="determinate" value={summary?.avg_ml_performance_score ?? 0} sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: scoreColor(summary?.avg_ml_performance_score ?? 0), borderRadius: 3 } }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28 }}>{fmtNum(summary?.avg_ml_performance_score, 0)}</Typography>
                          </Stack>
                        </Grid>
                        <Grid size={{ xs: 6, md: 4 }}>
                          <Typography variant="caption" color="text.secondary">Mensurabilidade</Typography>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress variant="determinate" value={summary?.avg_measurability_score ?? 0} sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: scoreColor(summary?.avg_measurability_score ?? 0), borderRadius: 3 } }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28 }}>{fmtNum(summary?.avg_measurability_score, 0)}</Typography>
                          </Stack>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Coverage */}
                {summary?.coverage && (
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack spacing={1}>
                        {[
                          { label: 'Plataformas', items: summary.coverage.platforms },
                          { label: 'Tipos de produção', items: summary.coverage.production_types },
                          { label: 'Etapas do funil', items: summary.coverage.funnel_stages },
                        ].filter(({ items }) => items?.length > 0).map(({ label, items }) => (
                          <Stack key={label} direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, fontWeight: 600 }}>{label}</Typography>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {items.map((item) => (
                                <Chip key={item} size="small" label={item} sx={{ height: 18, fontSize: '0.62rem' }} />
                              ))}
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings + suggestions */}
                {(result.warnings?.length > 0 || result.suggestions?.length > 0) && (
                  <Stack spacing={1}>
                    {result.warnings?.map((w, i) => (
                      <Alert key={i} severity="warning" sx={{ fontSize: '0.8rem', py: 0.5 }}>{w}</Alert>
                    ))}
                    {result.suggestions?.map((s, i) => (
                      <Alert key={i} severity="info" sx={{ fontSize: '0.8rem', py: 0.5 }}>{s}</Alert>
                    ))}
                  </Stack>
                )}

                {/* Extracted parameters */}
                {result.briefing?.extracted_parameters && (
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                        PARÂMETROS EXTRAÍDOS DO BRIEFING
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          fontSize: '0.68rem', bgcolor: 'grey.50', borderRadius: 2,
                          p: 1.5, overflowX: 'auto', m: 0,
                          fontFamily: 'monospace', color: 'text.secondary',
                          maxHeight: 200,
                        }}
                      >
                        {JSON.stringify(result.briefing.extracted_parameters, null, 2)}
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Formats list */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
                    {result.recommended_formats.length} Formato{result.recommended_formats.length !== 1 ? 's' : ''} recomendado{result.recommended_formats.length !== 1 ? 's' : ''}
                  </Typography>
                  <Stack spacing={1.5}>
                    {result.recommended_formats.map((fmt, i) => (
                      <FormatCard key={fmt.format_id} fmt={fmt} index={i} />
                    ))}
                  </Stack>
                </Box>

                {/* Processing log */}
                {result.processing_log?.length > 0 && (
                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" onClick={() => setShowLog((v) => !v)} sx={{ cursor: 'pointer' }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconClock size={14} color="#94a3b8" />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            LOG DE PROCESSAMENTO · {totalMs}ms total
                          </Typography>
                        </Stack>
                        {showLog ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                      </Stack>
                      <Collapse in={showLog}>
                        <Divider sx={{ my: 1 }} />
                        <Stack spacing={0.5}>
                          {result.processing_log.map((phase, i) => (
                            <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="text.secondary">{phase.phase}</Typography>
                              <Chip size="small" label={`${phase.duration_ms}ms`} sx={{ height: 16, fontSize: '0.6rem', fontFamily: 'monospace' }} />
                            </Stack>
                          ))}
                        </Stack>
                      </Collapse>
                    </CardContent>
                  </Card>
                )}

                {/* Footer meta */}
                <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>
                  ID: {result.id} · {new Date(result.created_at).toLocaleString('pt-BR')}
                </Typography>
              </Stack>
            )}
          </Grid>
        </Grid>
      </Box>
    </AppShell>
  );
}
