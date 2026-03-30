'use client';
import { Handle, Position } from '@xyflow/react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import {
  IconChartBar, IconRefresh, IconCheck, IconAlertTriangle,
  IconBolt, IconClock, IconShieldCheck,
} from '@tabler/icons-react';
import { useState } from 'react';
import NodeShell from '../NodeShell';
import { usePipeline } from '../PipelineContext';
import { apiPost } from '@/lib/api';

type RiskFlag = {
  code: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
};

type VariantResult = {
  index: number;
  text_preview: string;
  predicted_save_rate: number;
  predicted_click_rate: number;
  predicted_engagement_rate: number;
  aggregate_resonance: number;
  fatigue_days: number;
  top_cluster: string;
  risk_flags: RiskFlag[];
};

type SimulationReport = {
  id: string;
  winner_index: number;
  winner_resonance: number;
  variants: VariantResult[];
  prediction_confidence: number;
  prediction_confidence_label: string;
  cold_start: boolean;
  cold_start_message?: string;
  timing_context: { has_data: boolean; best_slot_label: string; peak_multiplier: number } | null;
  summary: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  low: '#F59E0B', medium: '#F97316', high: '#EF4444',
};

const BAR_COLOR = '#5D87FF';

function PctBar({ value, color = BAR_COLOR }: { value: number; color?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}>
        <Box sx={{ width: `${Math.min(100, value * 100)}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.5s' }} />
      </Box>
      <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', minWidth: 32, textAlign: 'right' }}>
        {(value * 100).toFixed(1)}%
      </Typography>
    </Box>
  );
}

export default function SimulationNode() {
  const { briefing, copyOptions, selectedCopyIdx } = usePipeline() as any;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SimulationReport | null>(null);

  const selectedCopy = copyOptions?.[selectedCopyIdx ?? 0];

  async function handleSimulate() {
    if (!selectedCopy?.text) {
      setError('Nenhuma copy selecionada. Gere copy primeiro.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const variants = (copyOptions ?? []).slice(0, 5).map((c: any, i: number) => ({
        index: i,
        text: c.text ?? c.copy ?? c,
        amd: c.amd ?? briefing?.amd ?? undefined,
        triggers: c.triggers ?? (briefing?.selectedTrigger ? [briefing.selectedTrigger] : undefined),
      }));

      const res = await apiPost<{ ok: boolean; simulation: SimulationReport }>(
        '/simulation/preview',
        {
          client_id:  briefing?.client_id ?? undefined,
          platform:   briefing?.plataforma ?? undefined,
          variants,
        },
      );
      if (!res.ok) throw new Error('Simulação falhou');
      setResult(res.simulation);
    } catch (e: any) {
      setError(e?.message ?? 'Erro na simulação');
    } finally {
      setLoading(false);
    }
  }

  const hasCopy = !!(selectedCopy?.text || selectedCopy?.copy);
  const winner = result?.variants.find(v => v.index === result.winner_index);

  const collapsedSummary = result ? (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <IconCheck size={12} color="#13DEB9" />
      <Box>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
          CTR ~{((winner?.predicted_click_rate ?? 0) * 100).toFixed(1)}% · Salvar ~{((winner?.predicted_save_rate ?? 0) * 100).toFixed(1)}%
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
          Confiança: {result.prediction_confidence_label}
        </Typography>
      </Box>
    </Stack>
  ) : null;

  return (
    <Box>
      <Handle type="target" position={Position.Left} id="sim_in"
        style={{ background: '#444', width: 8, height: 8, border: 'none' }} />

      <NodeShell
        title="Simulação de Resultado"
        icon={<IconChartBar size={14} />}
        status={result ? 'done' : loading ? 'running' : hasCopy ? 'active' : 'locked'}
        accentColor="#5D87FF"
        collapsedSummary={collapsedSummary}
        onRerun={result ? handleSimulate : undefined}
      >
        {loading && (
          <Box sx={{ mb: 1.5 }}>
            <LinearProgress sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#5D87FF,#13DEB9)' } }} />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 0.5 }}>
              Simulando {(copyOptions?.length ?? 1)} variante(s)…
            </Typography>
          </Box>
        )}

        {error && (
          <Typography sx={{ fontSize: '0.7rem', color: '#EF4444', mb: 1 }}>{error}</Typography>
        )}

        {!result && !loading && (
          <Stack spacing={1.5}>
            {!hasCopy ? (
              <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', textAlign: 'center', py: 1 }}>
                Gere copy primeiro para habilitar a simulação.
              </Typography>
            ) : (
              <>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.5 }}>
                  Prevê alcance, CTR e salvar antes de publicar, com base no histórico do cliente e clusters de audiência.
                </Typography>
                {copyOptions?.length > 1 && (
                  <Chip
                    label={`${copyOptions.length} variantes serão simuladas`}
                    size="small"
                    sx={{ fontSize: '0.62rem', height: 20, background: 'rgba(93,135,255,0.12)', color: '#5D87FF' }}
                  />
                )}
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<IconChartBar size={14} />}
                  onClick={handleSimulate}
                  sx={{ fontSize: '0.72rem', textTransform: 'none', background: 'linear-gradient(135deg,#5D87FF,#13DEB9)', '&:hover': { opacity: 0.9 } }}
                >
                  Simular Resultado
                </Button>
              </>
            )}
          </Stack>
        )}

        {result && (
          <Stack spacing={1.25}>
            {/* Cold start warning */}
            {result.cold_start && (
              <Chip
                label={result.cold_start_message ?? 'Estimativas com benchmarks de mercado (dados insuficientes)'}
                size="small"
                icon={<IconAlertTriangle size={11} />}
                sx={{ fontSize: '0.6rem', height: 'auto', py: 0.4, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', '& .MuiChip-label': { whiteSpace: 'normal' } }}
              />
            )}

            {/* Confidence */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconShieldCheck size={12} color="#888" />
                <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>Confiança</Typography>
              </Stack>
              <Chip
                label={result.prediction_confidence_label}
                size="small"
                sx={{
                  fontSize: '0.6rem', height: 18,
                  background: result.prediction_confidence >= 70 ? 'rgba(19,222,185,0.12)' : result.prediction_confidence >= 45 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  color: result.prediction_confidence >= 70 ? '#13DEB9' : result.prediction_confidence >= 45 ? '#F59E0B' : '#EF4444',
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

            {/* Variants */}
            {result.variants.map((v) => {
              const isWinner = v.index === result.winner_index;
              return (
                <Box
                  key={v.index}
                  sx={{
                    p: 0.75, borderRadius: 1,
                    border: `1px solid ${isWinner ? '#5D87FF44' : '#1e1e1e'}`,
                    background: isWinner ? 'rgba(93,135,255,0.06)' : 'transparent',
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Stack direction="row" spacing={0.4} alignItems="center">
                      {isWinner && <IconBolt size={11} color="#5D87FF" />}
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: isWinner ? '#5D87FF' : 'text.secondary' }}>
                        Variante {v.index + 1}{isWinner ? ' · Vencedora' : ''}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                      Ressonância {(v.aggregate_resonance * 100).toFixed(0)}
                    </Typography>
                  </Stack>

                  <Stack spacing={0.4}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', width: 42 }}>CTR</Typography>
                      <Box sx={{ flex: 1 }}>
                        <PctBar value={v.predicted_click_rate} color="#5D87FF" />
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', width: 42 }}>Salvar</Typography>
                      <Box sx={{ flex: 1 }}>
                        <PctBar value={v.predicted_save_rate} color="#13DEB9" />
                      </Box>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', width: 42 }}>Eng.</Typography>
                      <Box sx={{ flex: 1 }}>
                        <PctBar value={v.predicted_engagement_rate} color="#A855F7" />
                      </Box>
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                    <Chip label={`Fadiga ~${v.fatigue_days}d`} size="small"
                      icon={<IconClock size={10} />}
                      sx={{ fontSize: '0.58rem', height: 16, background: 'rgba(255,255,255,0.04)', color: 'text.disabled' }} />
                    {v.risk_flags.slice(0, 2).map(rf => (
                      <Chip key={rf.code} label={rf.label} size="small"
                        sx={{ fontSize: '0.58rem', height: 16, background: `${SEVERITY_COLOR[rf.severity]}18`, color: SEVERITY_COLOR[rf.severity] }} />
                    ))}
                  </Stack>
                </Box>
              );
            })}

            {/* Timing */}
            {result.timing_context?.has_data && (
              <>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconClock size={11} color="#888" />
                  <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                    Melhor horário: <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.62rem' }}>{result.timing_context.best_slot_label}</Typography>
                    {result.timing_context.peak_multiplier > 1 && ` · ${result.timing_context.peak_multiplier.toFixed(1)}× pico`}
                  </Typography>
                </Stack>
              </>
            )}

            {/* Summary */}
            {result.summary && (
              <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1.5, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', pt: 0.75 }}>
                {result.summary}
              </Typography>
            )}

            <Tooltip title="Re-simular">
              <Button size="small" variant="outlined" startIcon={<IconRefresh size={12} />}
                onClick={handleSimulate}
                sx={{ fontSize: '0.65rem', textTransform: 'none', borderColor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }}>
                Re-simular
              </Button>
            </Tooltip>
          </Stack>
        )}
      </NodeShell>

      <Handle type="source" position={Position.Right} id="sim_out"
        style={{ background: '#5D87FF', width: 8, height: 8, border: 'none' }} />
    </Box>
  );
}
