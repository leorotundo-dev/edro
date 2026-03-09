'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import { IconChartBar, IconRefresh, IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';

type RoiScore = {
  behavioral_copy_id: string;
  campaign_id: string;
  platform: string;
  hook_text: string | null;
  fogg_composite: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend_brl: number;
  total_revenue_brl: number;
  avg_ctr: number | null;
  avg_roas: number | null;
  ai_cost_brl: number;
  roi_score: number;
  roi_label: string;
  roi_pct: number | null;
  summary: string;
  computed_at: string;
};

const LABEL_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; text: string }> = {
  excellent: { color: '#13DEB9', bg: 'rgba(19,222,185,0.1)', icon: <IconTrendingUp size={13} />, text: 'Excelente' },
  good:      { color: '#5D87FF', bg: 'rgba(93,135,255,0.1)', icon: <IconTrendingUp size={13} />, text: 'Bom' },
  average:   { color: '#FFAE1F', bg: 'rgba(255,174,31,0.1)', icon: <IconMinus size={13} />, text: 'Médio' },
  poor:      { color: '#FF4D4D', bg: 'rgba(255,77,77,0.1)', icon: <IconTrendingDown size={13} />, text: 'Baixo' },
  no_data:   { color: '#888', bg: 'rgba(136,136,136,0.1)', icon: <IconMinus size={13} />, text: 'Sem dados' },
};

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? '#13DEB9' : score >= 55 ? '#5D87FF' : score >= 35 ? '#FFAE1F' : '#FF4D4D';
  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: '0.7rem', color: '#888' }}>ROI Score</Typography>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color }}>{score}/100</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{ height: 5, borderRadius: 2, bgcolor: '#1e1e1e', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }}
      />
    </Box>
  );
}

export default function CopyRoiPanel({ clientId }: { clientId: string }) {
  const [scores, setScores] = useState<RoiScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const loadScores = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<{ scores: RoiScore[] }>(`/clients/${clientId}/reports/copy-roi`);
      setScores(res.scores || []);
      setLoaded(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar scores.');
    } finally {
      setLoading(false);
    }
  };

  const computeScores = async () => {
    setComputing(true);
    setError('');
    try {
      const res = await apiPost<{ scores: RoiScore[] }>(`/clients/${clientId}/reports/compute-copy-roi`, {});
      setScores(res.scores || []);
      setLoaded(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao calcular ROI.');
    } finally {
      setComputing(false);
    }
  };

  if (!loaded) {
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <IconChartBar size={20} color="#E85219" />
            <Typography variant="h6" fontWeight={700} color="#E85219">Score ROI por Copy</Typography>
            <Chip label="IA" size="small" sx={{ bgcolor: '#E85219', color: '#fff', fontSize: '0.6rem' }} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Correlaciona qualidade Fogg dos copies com performance real do Meta — impressões, CTR, ROAS, conversões e custo de geração com IA.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={loadScores} disabled={loading}
              startIcon={loading ? <CircularProgress size={14} /> : <IconChartBar size={14} />}
              sx={{ borderColor: '#E85219', color: '#E85219', textTransform: 'none' }}>
              {loading ? 'Carregando…' : 'Ver Scores Salvos'}
            </Button>
            <Button variant="contained" size="small" onClick={computeScores} disabled={computing}
              startIcon={computing ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <IconRefresh size={14} />}
              sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c94a17' }, textTransform: 'none', fontWeight: 700 }}>
              {computing ? 'Calculando…' : 'Calcular ROI Agora'}
            </Button>
          </Stack>
          {error && <Typography sx={{ mt: 1, fontSize: '0.75rem', color: '#FF4D4D' }}>{error}</Typography>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconChartBar size={20} color="#E85219" />
            <Typography variant="h6" fontWeight={700} color="#E85219">Score ROI por Copy</Typography>
            <Chip label={`${scores.length} copies`} size="small" sx={{ fontSize: '0.62rem' }} />
          </Stack>
          <Button size="small" variant="outlined" onClick={computeScores} disabled={computing}
            startIcon={computing ? <CircularProgress size={12} /> : <IconRefresh size={13} />}
            sx={{ borderColor: '#E8521944', color: '#E85219', textTransform: 'none', fontSize: '0.65rem' }}>
            {computing ? 'Atualizando…' : 'Recalcular'}
          </Button>
        </Stack>

        {error && <Typography sx={{ mb: 1, fontSize: '0.75rem', color: '#FF4D4D' }}>{error}</Typography>}

        {scores.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum copy com behavioral analysis encontrado. Gere copies via Campanhas primeiro.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {scores.map((s) => {
              const cfg = LABEL_CONFIG[s.roi_label] || LABEL_CONFIG.no_data;
              const hasPerf = s.total_impressions > 0;
              return (
                <Box key={s.behavioral_copy_id} sx={{
                  p: 1.5, borderRadius: 1.5, border: '1px solid',
                  borderColor: `${cfg.color}33`, bgcolor: cfg.bg,
                }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <Chip
                      size="small"
                      icon={cfg.icon as any}
                      label={cfg.text}
                      sx={{ height: 20, fontSize: '0.6rem', bgcolor: cfg.color, color: '#fff', fontWeight: 700 }}
                    />
                    <Chip size="small" label={s.platform}
                      sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'transparent', border: `1px solid ${cfg.color}44`, color: cfg.color }} />
                    {s.roi_pct !== null && (
                      <Chip size="small" label={`ROI real: ${fmt(s.roi_pct, 0)}%`}
                        sx={{ height: 20, fontSize: '0.6rem', bgcolor: s.roi_pct >= 0 ? 'rgba(19,222,185,0.15)' : 'rgba(255,77,77,0.15)',
                          color: s.roi_pct >= 0 ? '#13DEB9' : '#FF4D4D', fontWeight: 700 }} />
                    )}
                  </Stack>

                  {s.hook_text && (
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, mb: 0.5, color: 'text.primary',
                      display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      "{s.hook_text}"
                    </Typography>
                  )}

                  <ScoreBar score={s.roi_score} />

                  {/* Metrics row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75, mt: 1 }}>
                    <Tooltip title="Fogg composite (0-10)">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#A855F7' }}>
                          {s.fogg_composite.toFixed(1)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: '#888' }}>Fogg</Typography>
                      </Box>
                    </Tooltip>
                    <Tooltip title="Impressões totais">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: hasPerf ? '#5D87FF' : '#555' }}>
                          {hasPerf ? fmt(s.total_impressions) : '—'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: '#888' }}>Impressões</Typography>
                      </Box>
                    </Tooltip>
                    <Tooltip title="CTR (clicks / impressões)">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: s.avg_ctr !== null ? '#FFAE1F' : '#555' }}>
                          {s.avg_ctr !== null ? `${(s.avg_ctr * 100).toFixed(2)}%` : '—'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: '#888' }}>CTR</Typography>
                      </Box>
                    </Tooltip>
                    <Tooltip title="ROAS (receita / investimento)">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: s.avg_roas !== null ? '#13DEB9' : '#555' }}>
                          {s.avg_roas !== null ? `${s.avg_roas.toFixed(1)}×` : '—'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.58rem', color: '#888' }}>ROAS</Typography>
                      </Box>
                    </Tooltip>
                  </Box>

                  {s.summary && (
                    <Typography sx={{ mt: 0.75, fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.5, fontStyle: 'italic' }}>
                      {s.summary}
                    </Typography>
                  )}

                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                      Custo IA: R$ {s.ai_cost_brl.toFixed(4)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: '#555' }}>
                      {new Date(s.computed_at).toLocaleDateString('pt-BR')}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
