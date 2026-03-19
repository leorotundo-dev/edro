'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBolt,
  IconChartBar,
  IconCheck,
  IconFlame,
  IconHistory,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconTrophy,
  IconAlertTriangle,
  IconShieldCheck,
  IconTargetArrow,
} from '@tabler/icons-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Variant {
  index: number;
  text: string;
  amd: string;
  triggers: string;
  fogg_motivation: number;
  fogg_ability: number;
  fogg_prompt: number;
}

interface ClusterScore {
  cluster_type: string;
  cluster_label: string;
  resonance_score: number;
  amd_match: boolean;
  trigger_matches: string[];
  risk_level: 'low' | 'medium' | 'high';
}

interface RiskFlag {
  type: string;
  severity: 'warning' | 'critical';
  description: string;
  variant_index: number;
}

interface VariantResult {
  index: number;
  text_preview: string;
  aggregate_resonance: number;
  predicted_save_rate: number;
  predicted_click_rate: number;
  predicted_engagement_rate: number;
  top_cluster: string;
  scores_by_cluster: ClusterScore[];
  risk_flags: RiskFlag[];
  fatigue_days: number;
  fatigue_source: 'historical' | 'benchmark';
}

interface SimulationReport {
  id: string;
  winner_index: number;
  winner_resonance: number;
  variants: VariantResult[];
  cluster_count: number;
  rule_count: number;
  confidence_avg: number;
  prediction_confidence: number;
  prediction_confidence_label: string;
  cold_start: boolean;
  cold_start_message?: string;
  summary: string;
  created_at: string;
}

interface ClientAccuracy {
  outcome_count: number;
  avg_accuracy_pct: number;
}

interface PastSimulation {
  id: string;
  platform: string;
  winner_index: number;
  winner_predicted_save_rate: string;
  winner_predicted_click_rate: string;
  winner_fatigue_days: number;
  cluster_count: number;
  confidence_avg: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ['instagram', 'linkedin', 'tiktok', 'twitter', 'facebook'];

const AMD_OPTIONS = [
  'salvar', 'compartilhar', 'clicar', 'responder', 'pedir_proposta',
];

const TRIGGER_OPTIONS = [
  'urgência', 'especificidade', 'prova_social', 'autoridade', 'curiosidade',
  'exclusividade', 'medo_perda', 'reciprocidade',
];

const RISK_COLORS: Record<string, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
};

const CLUSTER_COLOR: Record<string, string> = {
  salvadores: '#5D87FF',
  clicadores: '#13DEB9',
  leitores_silenciosos: '#FFAE1F',
  convertidos: '#FA896B',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resonanceColor(score: number) {
  if (score >= 70) return '#13DEB9';
  if (score >= 45) return '#FFAE1F';
  return '#FA896B';
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function makeEmptyVariant(index: number): Variant {
  return { index, text: '', amd: '', triggers: '', fogg_motivation: 7, fogg_ability: 7, fogg_prompt: 7 };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VariantCard({
  variant,
  onChange,
  onRemove,
  canRemove,
}: {
  variant: Variant;
  onChange: (v: Variant) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600}>Variante {variant.index + 1}</Typography>
          {canRemove && (
            <IconButton size="small" onClick={onRemove} color="error">
              <IconTrash size={16} />
            </IconButton>
          )}
        </Stack>

        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          label="Copy"
          placeholder="Cole ou escreva a copy desta variante..."
          value={variant.text}
          onChange={(e) => onChange({ ...variant, text: e.target.value })}
          sx={{ mb: 2 }}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="AMD (Ação de Micro-Decisão)"
              value={variant.amd}
              onChange={(e) => onChange({ ...variant, amd: e.target.value })}
            >
              <MenuItem value="">— nenhum —</MenuItem>
              {AMD_OPTIONS.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Gatilhos (ex: urgência, prova_social)"
              value={variant.triggers}
              onChange={(e) => onChange({ ...variant, triggers: e.target.value })}
              helperText="Separe com vírgula"
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" mt={2} display="block">
          Fogg Score — Motivação / Facilidade / CTA
        </Typography>
        <Stack direction="row" spacing={2} mt={0.5}>
          {(['fogg_motivation', 'fogg_ability', 'fogg_prompt'] as const).map((key, i) => (
            <TextField
              key={key}
              type="number"
              size="small"
              label={['Motivação', 'Facilidade', 'CTA'][i]}
              value={variant[key]}
              onChange={(e) => onChange({ ...variant, [key]: Number(e.target.value) })}
              inputProps={{ min: 1, max: 10 }}
              sx={{ width: 90 }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ResonanceBar({ score }: { score: number }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={0.3}>
        <Typography variant="caption" color="text.secondary">Ressonância</Typography>
        <Typography variant="caption" fontWeight={700} color={resonanceColor(score)}>
          {score}/100
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': { backgroundColor: resonanceColor(score), borderRadius: 4 },
        }}
      />
    </Box>
  );
}

function VariantResultCard({
  result,
  isWinner,
}: {
  result: VariantResult;
  isWinner: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const criticalFlags = result.risk_flags.filter((f) => f.severity === 'critical');
  const warningFlags = result.risk_flags.filter((f) => f.severity === 'warning');

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderColor: isWinner ? 'primary.main' : 'divider',
        borderWidth: isWinner ? 2 : 1,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {isWinner && (
        <Chip
          icon={<IconTrophy size={14} />}
          label="Vencedora"
          color="primary"
          size="small"
          sx={{ position: 'absolute', top: -12, right: 16, fontWeight: 700 }}
        />
      )}

      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography fontWeight={700}>Variante {result.index + 1}</Typography>
          <Stack direction="row" spacing={1}>
            {criticalFlags.length > 0 && (
              <Chip icon={<IconAlertTriangle size={12} />} label={`${criticalFlags.length} crítico`} color="error" size="small" />
            )}
            {warningFlags.length > 0 && (
              <Chip icon={<IconAlertTriangle size={12} />} label={`${warningFlags.length} alerta`} color="warning" size="small" />
            )}
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" fontStyle="italic" mb={2}>
          "{result.text_preview}{result.text_preview.length >= 120 ? '…' : ''}"
        </Typography>

        <ResonanceBar score={result.aggregate_resonance} />

        <Grid container spacing={2} mt={1}>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">Save Rate</Typography>
            <Typography fontWeight={700} color="primary.main">{pct(result.predicted_save_rate)}</Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">CTR</Typography>
            <Typography fontWeight={700} color="success.main">{pct(result.predicted_click_rate)}</Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">Vida Útil</Typography>
            <Typography fontWeight={700} color="warning.main">
              {result.fatigue_days}d
              <Typography variant="caption" ml={0.5} color="text.secondary">
                ({result.fatigue_source === 'historical' ? 'histórico' : 'benchmark'})
              </Typography>
            </Typography>
          </Grid>
        </Grid>

        {result.top_cluster && (
          <Chip
            label={`Melhor cluster: ${result.top_cluster}`}
            size="small"
            sx={{
              mt: 1.5,
              backgroundColor: CLUSTER_COLOR[result.top_cluster] ?? '#5D87FF',
              color: '#fff',
              fontWeight: 600,
            }}
          />
        )}

        {result.scores_by_cluster.length > 0 && (
          <>
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded((e) => !e)}
              sx={{ mt: 1, color: 'text.secondary', fontSize: 12 }}
            >
              {expanded ? 'Ocultar' : 'Ver'} detalhes por cluster ({result.scores_by_cluster.length})
            </Button>
            <Collapse in={expanded}>
              <Box mt={1}>
                {result.scores_by_cluster.map((cs, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1} mb={0.75}>
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: CLUSTER_COLOR[cs.cluster_type] ?? '#ccc',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 140 }}>
                      {cs.cluster_label}
                    </Typography>
                    <Box flex={1}>
                      <LinearProgress
                        variant="determinate"
                        value={cs.resonance_score}
                        sx={{
                          height: 5, borderRadius: 3,
                          backgroundColor: 'grey.100',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: CLUSTER_COLOR[cs.cluster_type] ?? '#5D87FF',
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="caption" fontWeight={700} sx={{ minWidth: 30 }}>
                      {cs.resonance_score}
                    </Typography>
                    {cs.amd_match && (
                      <Tooltip title="AMD match">
                        <IconCheck size={12} color="#13DEB9" />
                      </Tooltip>
                    )}
                    {cs.trigger_matches.length > 0 && (
                      <Chip label={cs.trigger_matches.length} size="small" sx={{ height: 16, fontSize: 10 }} />
                    )}
                  </Stack>
                ))}
              </Box>
            </Collapse>
          </>
        )}

        {result.risk_flags.length > 0 && (
          <Box mt={2}>
            {result.risk_flags.map((f, i) => (
              <Alert
                key={i}
                severity={RISK_COLORS[f.severity]}
                icon={<IconAlertTriangle size={14} />}
                sx={{ mb: 0.5, py: 0.25, fontSize: 12 }}
              >
                {f.description}
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SimulationClient() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id') ?? '';
  const campaignId = searchParams.get('campaign_id') ?? '';

  // Pre-fill from URL params if coming from campaign (v0_text, v0_amd, etc.)
  const initialVariants = (() => {
    const text = searchParams.get('v0_text') ?? '';
    if (!text) return [makeEmptyVariant(0), makeEmptyVariant(1)];
    return [{
      index: 0,
      text,
      amd: searchParams.get('v0_amd') ?? '',
      triggers: searchParams.get('v0_triggers') ?? '',
      fogg_motivation: Number(searchParams.get('v0_fm') ?? 7),
      fogg_ability: Number(searchParams.get('v0_fa') ?? 7),
      fogg_prompt: Number(searchParams.get('v0_fp') ?? 7),
    }, makeEmptyVariant(1)];
  })();

  const [tab, setTab] = useState(0);
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [platform, setPlatform] = useState(searchParams.get('platform') ?? 'instagram');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<PastSimulation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<ClientAccuracy | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      const data = await apiGet(`/simulation?${params}`);
      setHistory(data.simulations ?? []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [clientId]);

  // Load historical accuracy badge on mount
  useEffect(() => {
    if (!clientId) return;
    apiGet(`/simulation/accuracy?client_id=${clientId}`)
      .then((d) => { if (d.accuracy) setAccuracy(d.accuracy); })
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    if (tab === 1) loadHistory();
  }, [tab, loadHistory]);

  function addVariant() {
    if (variants.length >= 5) return;
    setVariants((vs) => [...vs, makeEmptyVariant(vs.length)]);
  }

  function removeVariant(index: number) {
    setVariants((vs) => vs.filter((_, i) => i !== index).map((v, i) => ({ ...v, index: i })));
  }

  function updateVariant(updated: Variant) {
    setVariants((vs) => vs.map((v) => (v.index === updated.index ? updated : v)));
  }

  async function runSimulation() {
    setError('');
    const filled = variants.filter((v) => v.text.trim().length >= 10);
    if (filled.length === 0) {
      setError('Insira pelo menos uma variante com 10+ caracteres.');
      return;
    }

    setRunning(true);
    setReport(null);
    try {
      const payload = {
        platform,
        client_id: clientId || undefined,
        campaign_id: campaignId || undefined,
        variants: filled.map((v) => ({
          index: v.index,
          text: v.text,
          amd: v.amd || undefined,
          triggers: v.triggers ? v.triggers.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          fogg_motivation: v.fogg_motivation,
          fogg_ability: v.fogg_ability,
          fogg_prompt: v.fogg_prompt,
        })),
      };

      const data = await apiPost('/simulation/preview', payload);
      setReport(data.simulation);
      setTab(0);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao executar simulação.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 42, height: 42, borderRadius: 2,
              background: 'linear-gradient(135deg, #5D87FF 0%, #13DEB9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconSparkles size={22} color="#fff" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Simulador de Sucesso</Typography>
            <Typography variant="caption" color="text.secondary">
              Preveja performance antes de publicar — clusters reais + learning rules do cliente
            </Typography>
          </Box>
        </Stack>
        {/* Historical accuracy badge */}
        {accuracy && accuracy.outcome_count >= 3 && (
          <Tooltip title={`Baseado em ${accuracy.outcome_count} simulações anteriores deste cliente`}>
            <Paper
              variant="outlined"
              sx={{
                px: 1.5, py: 0.75, borderRadius: 2,
                borderColor: accuracy.avg_accuracy_pct >= 70 ? '#13DEB930' : '#FFAE1F30',
                bgcolor: accuracy.avg_accuracy_pct >= 70 ? 'rgba(19,222,185,0.05)' : 'rgba(255,174,31,0.05)',
                display: 'flex', alignItems: 'center', gap: 0.75,
              }}
            >
              <IconTargetArrow size={14} color={accuracy.avg_accuracy_pct >= 70 ? '#13DEB9' : '#FFAE1F'} />
              <Typography variant="caption" fontWeight={700} color={accuracy.avg_accuracy_pct >= 70 ? '#13DEB9' : '#FFAE1F'}>
                Acurácia histórica: {accuracy.avg_accuracy_pct.toFixed(0)}%
              </Typography>
            </Paper>
          </Tooltip>
        )}
      </Stack>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<IconBolt size={16} />} label="Nova Simulação" iconPosition="start" />
        <Tab icon={<IconHistory size={16} />} label="Histórico" iconPosition="start" />
      </Tabs>

      {/* ── Tab 0: Nova Simulação ── */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Left: Config */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                Configuração
              </Typography>

              <TextField
                select
                fullWidth
                label="Plataforma"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              >
                {PLATFORMS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>

              {clientId && campaignId && searchParams.get('v0_text') && (
                <Alert severity="success" icon={<IconBolt size={14} />} sx={{ mb: 2, fontSize: 12 }}>
                  Copy da campanha pré-carregada na Variante 1. Adicione mais variantes para comparar.
                </Alert>
              )}
              {clientId && !campaignId && (
                <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
                  Usando clusters do cliente <strong>{clientId}</strong>
                </Alert>
              )}
              {!clientId && (
                <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
                  Sem client_id — simulação usa apenas benchmarks gerais
                </Alert>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Variantes ({variants.length}/5)
                </Typography>
                <Button
                  size="small"
                  startIcon={<IconPlus size={14} />}
                  onClick={addVariant}
                  disabled={variants.length >= 5}
                >
                  Adicionar
                </Button>
              </Stack>
            </Paper>

            {/* Info cards */}
            <Stack spacing={1.5}>
              <Paper variant="outlined" sx={{ p: 1.5, borderColor: '#5D87FF30' }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <IconChartBar size={18} color="#5D87FF" />
                  <Box>
                    <Typography variant="caption" fontWeight={700}>Como funciona</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Cada variante é pontuada contra os 4 clusters do cliente (salvadores, clicadores, leitores, convertidos) usando AMD match, triggers e learning rules com uplift real.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, borderColor: '#13DEB930' }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <IconFlame size={18} color="#13DEB9" />
                  <Box>
                    <Typography variant="caption" fontWeight={700}>Fadiga estimada</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Calculada a partir do histórico real de decaimento de engajamento do cliente. Sem dados, usa benchmarks por AMD × plataforma.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          {/* Right: Variants + results */}
          <Grid size={{ xs: 12, md: 7 }}>
            {variants.map((v) => (
              <VariantCard
                key={v.index}
                variant={v}
                onChange={updateVariant}
                onRemove={() => removeVariant(v.index)}
                canRemove={variants.length > 1}
              />
            ))}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={running ? <CircularProgress size={16} color="inherit" /> : <IconSparkles size={18} />}
              onClick={runSimulation}
              disabled={running}
              sx={{
                py: 1.5,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #5D87FF 0%, #13DEB9 100%)',
                mb: 3,
              }}
            >
              {running ? 'Simulando…' : 'Simular Performance'}
            </Button>

            {/* Results */}
            {report && (
              <Box>
                <Divider sx={{ mb: 2 }}>
                  <Chip label="Resultado da Simulação" size="small" />
                </Divider>

                {/* Cold start banner */}
                {report.cold_start && report.cold_start_message && (
                  <Alert severity="warning" icon={<IconAlertTriangle size={16} />} sx={{ mb: 2, fontSize: 12 }}>
                    {report.cold_start_message}
                  </Alert>
                )}

                {/* Summary card */}
                <Alert
                  severity="success"
                  icon={<IconTrophy size={20} />}
                  sx={{ mb: 2, fontWeight: 500 }}
                >
                  {report.summary}
                </Alert>

                {/* Prediction confidence bar */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: report.prediction_confidence >= 75 ? '#13DEB930' : report.prediction_confidence >= 50 ? '#FFAE1F30' : '#FA896B30' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <IconShieldCheck size={15} color={report.prediction_confidence >= 75 ? '#13DEB9' : report.prediction_confidence >= 50 ? '#FFAE1F' : '#FA896B'} />
                      <Typography variant="caption" fontWeight={700}>Confiança da previsão</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={800} color={report.prediction_confidence >= 75 ? '#13DEB9' : report.prediction_confidence >= 50 ? '#FFAE1F' : '#FA896B'}>
                      {report.prediction_confidence_label}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={report.prediction_confidence}
                    sx={{
                      height: 6, borderRadius: 3,
                      backgroundColor: 'grey.100',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: report.prediction_confidence >= 75 ? '#13DEB9' : report.prediction_confidence >= 50 ? '#FFAE1F' : '#FA896B',
                        borderRadius: 3,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    {report.prediction_confidence >= 75
                      ? `Baseado em ${report.cluster_count} clusters reais + ${report.rule_count} learning rules`
                      : report.cold_start
                        ? 'Confiança aumenta após 5+ campanhas publicadas neste cliente'
                        : `Poucos dados — ${report.cluster_count} clusters, ${report.rule_count} rules`}
                  </Typography>
                </Paper>

                <Stack direction="row" spacing={2} mb={2}>
                  <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Clusters</Typography>
                    <Typography fontWeight={700} fontSize={22}>{report.cluster_count}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Learning Rules</Typography>
                    <Typography fontWeight={700} fontSize={22}>{report.rule_count}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Confiança clusters</Typography>
                    <Typography fontWeight={700} fontSize={22}>{(report.confidence_avg * 100).toFixed(0)}%</Typography>
                  </Paper>
                </Stack>

                {/* Variant results sorted by resonance */}
                {[...report.variants]
                  .sort((a, b) => b.aggregate_resonance - a.aggregate_resonance)
                  .map((vr) => (
                    <VariantResultCard
                      key={vr.index}
                      result={vr}
                      isWinner={vr.index === report.winner_index}
                    />
                  ))}
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── Tab 1: Histórico ── */}
      {tab === 1 && (
        <Box>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Alert severity="info">Nenhuma simulação encontrada. Execute a primeira acima.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {history.map((sim) => (
                <Paper key={sim.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Chip label={sim.platform ?? '—'} size="small" />
                      <Typography variant="body2" fontWeight={600}>
                        Vencedora: Var. {(sim.winner_index ?? 0) + 1}
                      </Typography>
                      {sim.winner_predicted_save_rate && (
                        <Typography variant="caption" color="text.secondary">
                          Save {pct(parseFloat(sim.winner_predicted_save_rate))} ·
                          CTR {pct(parseFloat(sim.winner_predicted_click_rate))} ·
                          Vida {sim.winner_fatigue_days}d
                        </Typography>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(sim.created_at).toLocaleString('pt-BR')}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
