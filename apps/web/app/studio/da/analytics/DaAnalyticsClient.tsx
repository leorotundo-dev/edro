'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconBulb,
  IconChartBar,
  IconFlame,
  IconLayoutGrid,
  IconTrendingUp,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerRow = {
  trigger_id: string;
  positive: number;
  negative: number;
  approval_rate: number;
};

type ConceptRow = {
  slug: string;
  title: string;
  category: string;
  score: number;
  rejection_rate: number;
};

type TrendRow = {
  tag: string;
  cluster_key: string;
  platform: string | null;
  segment: string | null;
  momentum: number;
  trend_score: number;
  recent_count: number;
  previous_count: number;
};

type MatrixRow = {
  platform: string;
  style: string;
  count: number;
  avg_confidence: number;
};

type Analytics = {
  triggers: TriggerRow[];
  concepts: ConceptRow[];
  trends: TrendRow[];
  platform_style_matrix: MatrixRow[];
  window_days: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  G01: 'Escassez',
  G02: 'Autoridade',
  G03: 'Prova Social',
  G04: 'Reciprocidade',
  G05: 'Curiosidade',
  G06: 'Identidade',
  G07: 'Dor/Solução',
  desconhecido: 'Não mapeado',
};

function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function momentumArrow(m: number) {
  if (m > 0.5) return '↑↑';
  if (m > 0) return '↑';
  if (m < -0.5) return '↓↓';
  if (m < 0) return '↓';
  return '→';
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          {icon}
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DaAnalyticsClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<{ success: boolean; data: Analytics }>(`/studio/creative/da-analytics?days=${days}`)
      .then((res) => setData(res.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  // Build matrix as unique platforms × styles
  const platforms = Array.from(new Set((data?.platform_style_matrix ?? []).map((r) => r.platform)));
  const styles = Array.from(new Set((data?.platform_style_matrix ?? []).map((r) => r.style))).slice(0, 8);
  const matrixMap = new Map((data?.platform_style_matrix ?? []).map((r) => [`${r.platform}|${r.style}`, r]));

  return (
    <AppShell title="Analytics DA" meta="Performance do motor de direção de arte">
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="text.secondary">
          Janela de análise:
        </Typography>
        <Select
          size="small"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          sx={{ minWidth: 110 }}
        >
          <MenuItem value={7}>7 dias</MenuItem>
          <MenuItem value={30}>30 dias</MenuItem>
          <MenuItem value={90}>90 dias</MenuItem>
          <MenuItem value={180}>180 dias</MenuItem>
        </Select>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2.5}>

          {/* ── Gatilhos ─────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Section title="Gatilhos" icon={<IconFlame size={18} color="#ef4444" />}>
              {!data?.triggers.length ? (
                <Typography variant="body2" color="text.secondary">Sem dados de feedback no período.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {data.triggers.map((row) => (
                    <Box key={row.trigger_id}>
                      <Stack direction="row" justifyContent="space-between" mb={0.4}>
                        <Typography variant="body2" fontWeight={600}>
                          {TRIGGER_LABELS[row.trigger_id] ?? row.trigger_id}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={`${row.positive} ✓`} sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#dcfce7', color: '#166534' }} />
                          {row.negative > 0 && (
                            <Chip size="small" label={`${row.negative} ✗`} sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#fee2e2', color: '#991b1b' }} />
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 700, color: scoreColor(row.approval_rate) }}>
                            {row.approval_rate}%
                          </Typography>
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={row.approval_rate}
                        sx={{
                          height: 5, borderRadius: 3,
                          '& .MuiLinearProgress-bar': { bgcolor: scoreColor(row.approval_rate) },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Section>
          </Grid>

          {/* ── Conceitos ────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Section title="Conceitos" icon={<IconBulb size={18} color="#f59e0b" />}>
              {!data?.concepts.length ? (
                <Typography variant="body2" color="text.secondary">Nenhum conceito cadastrado ainda.</Typography>
              ) : (
                <Stack spacing={1}>
                  {data.concepts.map((c) => (
                    <Stack key={c.slug} direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{c.title}</Typography>
                        <Typography variant="caption" color="text.disabled" noWrap>{c.category}</Typography>
                      </Box>
                      <Tooltip title={`Score: ${c.score}%`}>
                        <Box sx={{ width: 64 }}>
                          <LinearProgress
                            variant="determinate"
                            value={c.score}
                            sx={{
                              height: 6, borderRadius: 3,
                              '& .MuiLinearProgress-bar': { bgcolor: scoreColor(c.score) },
                            }}
                          />
                        </Box>
                      </Tooltip>
                      <Typography variant="caption" fontWeight={700} sx={{ color: scoreColor(c.score), width: 36, textAlign: 'right' }}>
                        {c.score}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Section>
          </Grid>

          {/* ── Trends ───────────────────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Section title="Trends de estilo" icon={<IconTrendingUp size={18} color="#8b5cf6" />}>
              {!data?.trends.length ? (
                <Typography variant="body2" color="text.secondary">Sem dados de tendência no período.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tag</TableCell>
                        <TableCell align="center">Plataforma</TableCell>
                        <TableCell align="right">Momentum</TableCell>
                        <TableCell align="right">Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.trends.slice(0, 12).map((t) => (
                        <TableRow key={t.cluster_key} sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{t.tag}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={t.platform ?? 'todos'} sx={{ height: 18, fontSize: '0.6rem' }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ color: t.momentum > 0 ? '#22c55e' : t.momentum < 0 ? '#ef4444' : 'text.secondary' }}
                            >
                              {momentumArrow(t.momentum)} {Math.abs(t.momentum).toFixed(1)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" fontWeight={700}>
                              {Number(t.trend_score).toFixed(0)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Section>
          </Grid>

          {/* ── Plataforma × Estilo matrix ───────────────────────────── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Section title="Plataforma × Estilo" icon={<IconLayoutGrid size={18} color="#5D87FF" />}>
              {!platforms.length ? (
                <Typography variant="body2" color="text.secondary">Sem referências analisadas ainda.</Typography>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Plataforma</TableCell>
                        {styles.map((s) => (
                          <TableCell key={s} align="center" sx={{ fontSize: '0.65rem', maxWidth: 70 }}>
                            <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {platforms.map((plat) => (
                        <TableRow key={plat} sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{plat}</TableCell>
                          {styles.map((s) => {
                            const cell = matrixMap.get(`${plat}|${s}`);
                            if (!cell) return <TableCell key={s} />;
                            const conf = Number(cell.avg_confidence);
                            const bg = conf >= 70 ? '#bbf7d0' : conf >= 45 ? '#fef9c3' : '#fee2e2';
                            return (
                              <Tooltip key={s} title={`${cell.count} peças · ${conf.toFixed(0)}% confiança`}>
                                <TableCell
                                  align="center"
                                  sx={{ bgcolor: bg, fontSize: '0.7rem', fontWeight: 700, cursor: 'default' }}
                                >
                                  {cell.count}
                                </TableCell>
                              </Tooltip>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Section>
          </Grid>

          {/* ── Summary banner ──────────────────────────────────────── */}
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'action.hover' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={1}>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Gatilhos monitorados</Typography>
                    <Typography variant="h6" fontWeight={800}>{data?.triggers.length ?? 0}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Conceitos ativos</Typography>
                    <Typography variant="h6" fontWeight={800}>{data?.concepts.length ?? 0}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Tags em tendência</Typography>
                    <Typography variant="h6" fontWeight={800}>{data?.trends.length ?? 0}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.disabled">Células na matriz</Typography>
                    <Typography variant="h6" fontWeight={800}>{data?.platform_style_matrix.length ?? 0}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      )}
    </AppShell>
  );
}
