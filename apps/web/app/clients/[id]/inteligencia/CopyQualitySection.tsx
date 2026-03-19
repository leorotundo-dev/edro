'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
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
  IconAlertTriangle,
  IconBan,
  IconCheck,
  IconChartBar,
  IconFlame,
  IconMessageCircle,
  IconShieldCheck,
  IconSparkles,
  IconStar,
  IconThumbDown,
  IconThumbUp,
} from '@tabler/icons-react';

// ── Types ────────────────────────────────────────────────────────────────────

type PreferenceContext = {
  editorial: {
    approved_sources: Array<{ domain: string; approval_rate: number }>;
    approved_categories: Array<{ category: string; approval_rate: number }>;
    rejected_categories: Array<{ category: string; rejection_count: number }>;
    cooldown_topics: string[];
    preferred_approaches: string[];
    preferred_platforms: string[];
    ideal_timing_days: number;
    approval_rate_30d: number;
  };
  creative: {
    good_copy_examples: string[];
    bad_copy_examples: string[];
    common_rejection_tags: string[];
    preferred_tone: string | null;
    preferred_length: 'short' | 'medium' | 'long' | null;
    platform_patterns: Array<{ platform: string; approval_rate: number; avg_length: number }>;
    approval_rate_30d: number;
  };
  total_feedback_count: number;
  learning_maturity: 'bootstrapping' | 'learning' | 'calibrated' | 'expert';
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const MATURITY_CONFIG = {
  bootstrapping: { label: 'Iniciando',   color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)', icon: <IconSparkles size={14} /> },
  learning:      { label: 'Aprendendo',  color: '#FF9800', bg: 'rgba(255,152,0,0.1)',   icon: <IconChartBar size={14} /> },
  calibrated:    { label: 'Calibrado',   color: '#5D87FF', bg: 'rgba(93,135,255,0.1)',  icon: <IconShieldCheck size={14} /> },
  expert:        { label: 'Expert',      color: '#4CAF50', bg: 'rgba(76,175,80,0.1)',   icon: <IconStar size={14} /> },
};

const MATURITY_DESCRIPTIONS = {
  bootstrapping: 'Menos de 20 feedbacks. A IA ainda está aprendendo os padrões deste cliente.',
  learning:      'Entre 20 e 100 feedbacks. Padrões emergindo, recomendações com precisão moderada.',
  calibrated:    'Entre 100 e 500 feedbacks. IA bem calibrada, padrões estáveis e confiáveis.',
  expert:        '500+ feedbacks. Máxima precisão. O sistema conhece profundamente este cliente.',
};

const MATURITY_PROGRESS = { bootstrapping: 10, learning: 35, calibrated: 70, expert: 100 };

const LENGTH_LABELS = { short: 'Curto (< 180 chars)', medium: 'Médio (180–420)', long: 'Longo (420+)' };

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function ApprovalBar({ rate }: { rate: number }) {
  const pctVal = Math.round(rate * 100);
  const color = pctVal >= 70 ? '#4CAF50' : pctVal >= 50 ? '#FF9800' : '#f44336';
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <LinearProgress
        variant="determinate"
        value={pctVal}
        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }}
      />
      <Typography variant="caption" fontWeight={700} color={color} sx={{ minWidth: 32, textAlign: 'right' }}>
        {pct(rate)}
      </Typography>
    </Stack>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CopyQualitySection({ clientId }: { clientId: string }) {
  const [ctx, setCtx] = useState<PreferenceContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<PreferenceContext>(`/clients/${clientId}/preferences/context`)
      .then(setCtx)
      .catch(() => setError('Erro ao carregar preferências do cliente.'))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!ctx) return null;

  const maturity = MATURITY_CONFIG[ctx.learning_maturity];
  const hasEditorial = ctx.editorial.approved_categories.length > 0 || ctx.editorial.rejected_categories.length > 0 || ctx.editorial.cooldown_topics.length > 0;
  const hasCreative = ctx.creative.common_rejection_tags.length > 0 || ctx.creative.preferred_tone || ctx.creative.platform_patterns.length > 0;

  return (
    <Stack gap={3}>

      {/* ── Maturity Header ── */}
      <Card variant="outlined" sx={{ borderColor: maturity.bg.replace('0.1', '0.4') }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2} mb={2}>
            <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: maturity.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: maturity.color }}>
                <IconShieldCheck size={20} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  Qualidade de Copy
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ctx.total_feedback_count} feedbacks acumulados
                </Typography>
              </Box>
            </Stack>
            <Tooltip title={MATURITY_DESCRIPTIONS[ctx.learning_maturity]} arrow>
              <Chip
                icon={<Box sx={{ color: maturity.color, display: 'flex' }}>{maturity.icon}</Box>}
                label={`Maturidade: ${maturity.label}`}
                size="small"
                sx={{ bgcolor: maturity.bg, color: maturity.color, fontWeight: 700, cursor: 'default', border: `1px solid ${maturity.color}40` }}
              />
            </Tooltip>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={MATURITY_PROGRESS[ctx.learning_maturity]}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(0,0,0,0.06)',
              '& .MuiLinearProgress-bar': { bgcolor: maturity.color, borderRadius: 4 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
            {MATURITY_DESCRIPTIONS[ctx.learning_maturity]}
          </Typography>
        </CardContent>
      </Card>

      {/* ── Approval Rates ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
              <IconThumbUp size={16} color="#5D87FF" />
              <Typography variant="subtitle2" fontWeight={700}>Taxa de Aprovação — Editorial (30d)</Typography>
            </Stack>
            <ApprovalBar rate={ctx.editorial.approval_rate_30d} />
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
              <IconMessageCircle size={16} color="#5D87FF" />
              <Typography variant="subtitle2" fontWeight={700}>Taxa de Aprovação — Copy (30d)</Typography>
            </Stack>
            <ApprovalBar rate={ctx.creative.approval_rate_30d} />
          </CardContent>
        </Card>
      </Stack>

      {/* ── Editorial Preferences ── */}
      {hasEditorial && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <IconCheck size={16} color="#5D87FF" />
              <Typography variant="subtitle1" fontWeight={700}>Preferências Editoriais</Typography>
            </Stack>

            <Stack gap={2.5}>
              {ctx.editorial.approved_categories.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Categorias aprovadas
                  </Typography>
                  <Stack gap={1}>
                    {ctx.editorial.approved_categories.slice(0, 8).map((c) => (
                      <Stack key={c.category} direction="row" alignItems="center" gap={1}>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{c.category}</Typography>
                        <ApprovalBar rate={c.approval_rate} />
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              {ctx.editorial.approved_categories.length > 0 && ctx.editorial.rejected_categories.length > 0 && (
                <Divider />
              )}

              {ctx.editorial.rejected_categories.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Categorias rejeitadas
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {ctx.editorial.rejected_categories.slice(0, 10).map((c) => (
                      <Chip
                        key={c.category}
                        icon={<IconBan size={12} />}
                        label={`${c.category} (${c.rejection_count}×)`}
                        size="small"
                        sx={{ bgcolor: 'rgba(244,67,54,0.08)', color: '#f44336', border: '1px solid rgba(244,67,54,0.25)', '& .MuiChip-icon': { color: '#f44336' } }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {ctx.editorial.cooldown_topics.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Tópicos em cooldown (evitar agora)
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {ctx.editorial.cooldown_topics.map((t) => (
                      <Chip
                        key={t}
                        icon={<IconFlame size={12} />}
                        label={t}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,152,0,0.1)', color: '#FF9800', border: '1px solid rgba(255,152,0,0.3)', '& .MuiChip-icon': { color: '#FF9800' } }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {ctx.editorial.preferred_approaches.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Abordagens preferidas
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {ctx.editorial.preferred_approaches.map((a) => (
                      <Chip key={a} label={a} size="small" sx={{ bgcolor: 'rgba(93,135,255,0.08)', color: '#5D87FF', border: '1px solid rgba(93,135,255,0.25)' }} />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Creative Preferences ── */}
      {hasCreative && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <IconAlertTriangle size={16} color="#5D87FF" />
              <Typography variant="subtitle1" fontWeight={700}>Padrões de Copy</Typography>
            </Stack>

            <Stack gap={2.5}>
              {(ctx.creative.preferred_tone || ctx.creative.preferred_length) && (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {ctx.creative.preferred_tone && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>Tom preferido</Typography>
                      <Chip label={ctx.creative.preferred_tone} size="small" sx={{ bgcolor: 'rgba(76,175,80,0.1)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)', fontWeight: 600 }} />
                    </Box>
                  )}
                  {ctx.creative.preferred_length && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.75 }}>Comprimento preferido</Typography>
                      <Chip label={LENGTH_LABELS[ctx.creative.preferred_length]} size="small" sx={{ bgcolor: 'rgba(93,135,255,0.08)', color: '#5D87FF', border: '1px solid rgba(93,135,255,0.25)' }} />
                    </Box>
                  )}
                </Stack>
              )}

              {ctx.creative.common_rejection_tags.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Padrões rejeitados com frequência
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {ctx.creative.common_rejection_tags.map((tag) => (
                      <Chip
                        key={tag}
                        icon={<IconThumbDown size={12} />}
                        label={tag}
                        size="small"
                        sx={{ bgcolor: 'rgba(244,67,54,0.08)', color: '#f44336', border: '1px solid rgba(244,67,54,0.25)', '& .MuiChip-icon': { color: '#f44336' } }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {ctx.creative.platform_patterns.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    Aprovação por plataforma
                  </Typography>
                  <Stack gap={1}>
                    {ctx.creative.platform_patterns.map((p) => (
                      <Stack key={p.platform} direction="row" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={500} sx={{ minWidth: 90, textTransform: 'capitalize' }}>{p.platform}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <ApprovalBar rate={p.approval_rate} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, textAlign: 'right' }}>
                          ø {Math.round(p.avg_length)} chars
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {!hasEditorial && !hasCreative && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Ainda sem dados suficientes para extrair padrões de qualidade. Os padrões emergem a partir de 20+ feedbacks aprovados e rejeitados.
        </Alert>
      )}
    </Stack>
  );
}
