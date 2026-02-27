'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconArrowDown,
  IconArrowUp,
  IconBrain,
  IconRefresh,
  IconSparkles,
  IconTarget,
  IconTrendingUp,
  IconUsersGroup,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

type CopyPreferences = {
  version: number;
  rebuilt_at: string;
  copy_feedback: {
    top_angles: { angle: string; avg_score: number; count: number }[];
    preferred_formats: { format: string; avg_score: number; count: number }[];
    anti_patterns: { pattern: string; avg_score: number; count: number }[];
    overall_avg_score: number;
    total_scored_copies: number;
  };
  amd_performance: {
    amd: string;
    momento: string;
    format: string;
    achieved: number;
    tracked: number;
    rate: number;
  }[];
  directives: {
    boost: string[];
    avoid: string[];
  };
};

type LearningRule = {
  rule_name: string;
  segment_definition: Record<string, any>;
  effective_pattern: string;
  uplift_metric: string;
  uplift_value: number;
  confidence_score: number;
  sample_size: number;
};

type BehaviorCluster = {
  cluster_type: 'salvadores' | 'clicadores' | 'leitores_silenciosos' | 'convertidos';
  cluster_label: string;
  avg_save_rate: number;
  avg_click_rate: number;
  avg_like_rate: number;
  avg_engagement_rate: number;
  preferred_format: string | null;
  preferred_amd: string | null;
  preferred_triggers: string[];
  sample_size: number;
  confidence_score: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 4) return 'success.main';
  if (score >= 3) return 'warning.main';
  return 'error.main';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AMD_LABELS: Record<string, string> = {
  salvar: 'Salvar',
  compartilhar: 'Compartilhar',
  clicar: 'Clicar',
  responder: 'Responder',
  marcar_alguem: 'Marcar alguém',
  pedir_proposta: 'Pedir proposta',
};

const SEG_COLORS: Record<string, { border: string; bg: string; chip: string }> = {
  amd:      { border: '#7c3aed', bg: '#faf5ff', chip: '#7c3aed' },
  trigger:  { border: '#0284c7', bg: '#f0f9ff', chip: '#0284c7' },
  platform: { border: '#059669', bg: '#f0fdf4', chip: '#059669' },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function ClientLearningClient({ clientId }: { clientId: string }) {
  const [prefs, setPrefs] = useState<CopyPreferences | null>(null);
  const [rules, setRules] = useState<LearningRule[]>([]);
  const [clusters, setClusters] = useState<BehaviorCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [computing, setComputing] = useState(false);
  const [computingProfiles, setComputingProfiles] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, rulesRes, clustersRes] = await Promise.all([
        apiGet<{ success: boolean; data: CopyPreferences | null }>(
          `/edro/clients/${clientId}/learning/preferences`
        ).catch(() => ({ success: false, data: null })),
        apiGet<{ success: boolean; data: LearningRule[] }>(
          `/clients/${clientId}/learning-rules`
        ).catch(() => ({ success: false, data: [] as LearningRule[] })),
        apiGet<{ success: boolean; data: BehaviorCluster[] }>(
          `/clients/${clientId}/behavior-profiles`
        ).catch(() => ({ success: false, data: [] as BehaviorCluster[] })),
      ]);
      setPrefs((prefsRes as any)?.data ?? null);
      setRules((rulesRes as any)?.data ?? []);
      setClusters((clustersRes as any)?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleRebuildPrefs = async () => {
    setRebuilding(true);
    try {
      const res = await apiPost<{ success: boolean; data: CopyPreferences }>(
        `/edro/clients/${clientId}/learning/rebuild`, {}
      );
      setPrefs((res as any)?.data ?? null);
    } finally {
      setRebuilding(false);
    }
  };

  const handleComputeRules = async () => {
    setComputing(true);
    try {
      const res = await apiPost<{ success: boolean; data: LearningRule[] }>(
        `/clients/${clientId}/learning-rules/compute`, {}
      );
      setRules((res as any)?.data ?? []);
    } finally {
      setComputing(false);
    }
  };

  const handleComputeProfiles = async () => {
    setComputingProfiles(true);
    try {
      const res = await apiPost<{ success: boolean; data: BehaviorCluster[] }>(
        `/clients/${clientId}/behavior-profiles/compute`, {}
      );
      setClusters((res as any)?.data ?? []);
    } finally {
      setComputingProfiles(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>

      {/* ── Header ── */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Motor de Aprendizado</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Padrões derivados de copies avaliados, performance de formatos e resultados de A/B tests.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={rebuilding ? <CircularProgress size={13} /> : <IconRefresh size={14} />}
            onClick={handleRebuildPrefs}
            disabled={rebuilding}
            sx={{ fontSize: '0.75rem' }}
          >
            {rebuilding ? 'Recalculando…' : 'Recalcular preferências'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={computing ? <CircularProgress size={13} /> : <IconTrendingUp size={14} />}
            onClick={handleComputeRules}
            disabled={computing}
            sx={{ fontSize: '0.75rem' }}
          >
            {computing ? 'Computando…' : 'Computar regras'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={computingProfiles ? <CircularProgress size={13} /> : <IconUsersGroup size={14} />}
            onClick={handleComputeProfiles}
            disabled={computingProfiles}
            sx={{ fontSize: '0.75rem' }}
          >
            {computingProfiles ? 'Computando…' : 'Computar perfis'}
          </Button>
        </Stack>
      </Stack>

      {!prefs && rules.length === 0 && clusters.length === 0 && (
        <Alert severity="info" icon={<IconBrain size={18} />}>
          Nenhum dado de aprendizado ainda. Avalie copies no Studio e registre métricas de performance nas campanhas para gerar padrões.
        </Alert>
      )}

      {/* ── Copy Performance Preferences ── */}
      {prefs && (
        <>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconBrain size={16} color="#7c3aed" />
            <Typography variant="subtitle1" fontWeight={700}>Preferências de Copy</Typography>
            <Typography variant="caption" color="text.secondary">
              {prefs.copy_feedback.total_scored_copies} copies avaliadas · score médio {prefs.copy_feedback.overall_avg_score}/5 · atualizado {fmtDate(prefs.rebuilt_at)}
            </Typography>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>

            {/* Directives boost */}
            {prefs.directives.boost.length > 0 && (
              <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '3px solid', borderLeftColor: 'success.main' }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                    <IconArrowUp size={14} color="#16a34a" />
                    <Typography variant="caption" fontWeight={700} color="success.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Impulsar
                    </Typography>
                  </Stack>
                  <Stack spacing={0.75}>
                    {prefs.directives.boost.map((item, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.5 }}>
                        · {item}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Directives avoid */}
            {prefs.directives.avoid.length > 0 && (
              <Card variant="outlined" sx={{ borderRadius: 2, borderLeft: '3px solid', borderLeftColor: 'error.main' }}>
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                    <IconArrowDown size={14} color="#dc2626" />
                    <Typography variant="caption" fontWeight={700} color="error.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Evitar
                    </Typography>
                  </Stack>
                  <Stack spacing={0.75}>
                    {prefs.directives.avoid.map((item, i) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.5 }}>
                        · {item}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Preferred formats */}
          {prefs.copy_feedback.preferred_formats.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Formatos com melhor score
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {prefs.copy_feedback.preferred_formats.map((f) => (
                  <Chip
                    key={f.format}
                    label={`${f.format} ${f.avg_score}/5`}
                    size="small"
                    sx={{ bgcolor: 'info.light', color: 'info.dark', fontWeight: 600, fontSize: '0.72rem' }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Top angles */}
          {prefs.copy_feedback.top_angles.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Abordagens bem avaliadas (top angles)
              </Typography>
              <Stack spacing={0.5}>
                {prefs.copy_feedback.top_angles.map((a, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(a.avg_score / 5) * 100}
                        sx={{
                          height: 5, borderRadius: 3, mb: 0.25,
                          '& .MuiLinearProgress-bar': { bgcolor: scoreColor(a.avg_score) },
                        }}
                      />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.angle}
                      </Typography>
                    </Box>
                    <Tooltip title={`${a.count} copies`}>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: scoreColor(a.avg_score), minWidth: 28, textAlign: 'right' }}>
                        {a.avg_score}/5
                      </Typography>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {/* Anti-patterns */}
          {prefs.copy_feedback.anti_patterns.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="error.main" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Anti-padrões (evitar)
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {prefs.copy_feedback.anti_patterns.map((p, i) => (
                  <Chip
                    key={i}
                    label={`${p.pattern} (${p.avg_score}/5)`}
                    size="small"
                    icon={<IconArrowDown size={12} />}
                    sx={{ bgcolor: 'error.light', color: 'error.main', fontSize: '0.7rem' }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* AMD performance */}
          {prefs.amd_performance.length > 0 && (
            <Box>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <IconTarget size={15} color="#E85219" />
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Performance por AMD
                </Typography>
              </Stack>
              <Stack spacing={0.75}>
                {prefs.amd_performance.map((row, i) => {
                  const ratePct = Number(row.rate);
                  const barColor = ratePct >= 70 ? 'success.main' : ratePct >= 40 ? 'warning.main' : 'error.main';
                  return (
                    <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                              <Chip size="small" label={AMD_LABELS[row.amd] ?? row.amd} sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#f3f0ff', color: '#7c3aed', fontWeight: 700 }} />
                              <Chip size="small" label={row.momento} sx={{ height: 16, fontSize: '0.6rem' }} />
                              <Chip size="small" label={row.format} variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={ratePct}
                              sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: barColor } }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: 700, color: barColor, minWidth: 40, textAlign: 'right' }}>
                            {ratePct}%
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', minWidth: 36 }}>
                            n={row.tracked}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}

          <Divider />
        </>
      )}

      {/* ── Behavior Clusters ── */}
      {clusters.length > 0 && (
        <Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
            <IconUsersGroup size={15} color="#0284c7" />
            <Typography variant="subtitle1" fontWeight={700}>Perfis de Audiência</Typography>
            <Typography variant="caption" color="text.secondary">
              Clusters derivados de métricas reais de formato × campanha.
            </Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            {clusters.map((c) => {
              const clusterColors: Record<string, { bg: string; border: string; text: string }> = {
                salvadores:            { bg: '#f3e8ff', border: '#7c3aed', text: '#5b21b6' },
                clicadores:            { bg: '#fff7ed', border: '#ea580c', text: '#9a3412' },
                leitores_silenciosos:  { bg: '#f0f9ff', border: '#0284c7', text: '#075985' },
                convertidos:           { bg: '#f0fdf4', border: '#16a34a', text: '#14532d' },
              };
              const cc = clusterColors[c.cluster_type] ?? { bg: '#f8fafc', border: '#94a3b8', text: '#334155' };
              return (
                <Card key={c.cluster_type} variant="outlined" sx={{ borderRadius: 2, borderLeft: `3px solid ${cc.border}`, bgcolor: cc.bg }}>
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: cc.text, display: 'block', mb: 0.75 }}>
                      {c.cluster_label}
                    </Typography>
                    <Stack spacing={0.5}>
                      {[
                        { label: 'Save rate', v: `${(c.avg_save_rate * 100).toFixed(1)}%` },
                        { label: 'Click rate', v: `${(c.avg_click_rate * 100).toFixed(1)}%` },
                        { label: 'Engagement', v: `${(c.avg_engagement_rate * 100).toFixed(1)}%` },
                      ].map(({ label, v }) => (
                        <Stack key={label} direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{label}</Typography>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.68rem' }}>{v}</Typography>
                        </Stack>
                      ))}
                      {c.preferred_format && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.25 }}>
                          Formato: {c.preferred_format}
                        </Typography>
                      )}
                      {c.preferred_triggers.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          {c.preferred_triggers.slice(0, 3).map((t) => (
                            <Chip key={t} label={t} size="small" sx={{ height: 15, fontSize: '0.58rem' }} />
                          ))}
                        </Stack>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75, fontSize: '0.62rem' }}>
                      n={c.sample_size} · confiança {Math.round(c.confidence_score * 100)}%
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}

      {/* ── Learning Rules from format performance ── */}
      <Box>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
          <IconSparkles size={15} color="#E85219" />
          <Typography variant="subtitle1" fontWeight={700}>Regras de Uplift</Typography>
          <Typography variant="caption" color="text.secondary">
            Padrões com uplift ≥ 15% vs. baseline derivados de métricas reais de campanhas.
          </Typography>
        </Stack>

        {rules.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhuma regra computada. Registre métricas de performance nas campanhas e clique em "Computar regras".
          </Typography>
        ) : (
          <Stack spacing={0.5}>
            {rules.map((rule) => {
              const segType = rule.segment_definition?.type ?? 'unknown';
              const colors = SEG_COLORS[segType] ?? { border: '#94a3b8', bg: '#f8fafc', chip: '#64748b' };
              const upliftLabel = `+${rule.uplift_value.toFixed(1)}%`;
              const metricLabel = rule.uplift_metric.replace(/_/g, ' ');
              const confidencePct = Math.round(rule.confidence_score * 100);
              return (
                <Card
                  key={rule.rule_name}
                  variant="outlined"
                  sx={{ borderRadius: 2, borderLeft: `3px solid ${colors.border}`, bgcolor: colors.bg }}
                >
                  <CardContent sx={{ py: 0.75, '&:last-child': { pb: 0.75 } }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={segType}
                        sx={{ height: 15, fontSize: '0.56rem', bgcolor: colors.chip, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      />
                      <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rule.effective_pattern}
                      </Typography>
                      <Tooltip title={`Uplift em ${metricLabel} · confiança ${confidencePct}% · n=${rule.sample_size}`}>
                        <Chip
                          size="small"
                          label={upliftLabel}
                          sx={{ height: 16, fontSize: '0.62rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d', flexShrink: 0 }}
                        />
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
