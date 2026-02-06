'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import DashboardCard from '@/components/shared/DashboardCard';
import Chart from '@/components/charts/Chart';
import { apiGet } from '@/lib/api';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import {
  IconRefresh,
  IconTargetArrow,
  IconThumbUp,
  IconThumbDown,
  IconAlertTriangle,
} from '@tabler/icons-react';

type QualityData = {
  feedback_summary: Record<string, number>;
  precision_percent: number | null;
  total_feedback: number;
  match_quality_by_client: Array<{
    client_id: string;
    client_name: string;
    total_matches: number;
    avg_score: number;
    relevant: number;
    irrelevant: number;
  }>;
  source_quality: Array<{
    source_id: string;
    source_name: string;
    total_items: number;
    archived: number;
    used: number;
    avg_score: number;
    garbage_pct: number;
  }>;
  suggested_negative_keywords: Array<{
    keyword: string;
    count: number;
  }>;
};

export default function ClippingQualityPage() {
  const [range, setRange] = useState('week');
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<QualityData>(`/clipping/quality?range=${range}`);
      setData(res);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const feedbackSummary = data?.feedback_summary || {};
  const relevant = feedbackSummary['relevant'] || 0;
  const irrelevant = feedbackSummary['irrelevant'] || 0;
  const wrongClient = feedbackSummary['wrong_client'] || 0;
  const precision = data?.precision_percent;

  const feedbackDonut = {
    series: [relevant, irrelevant, wrongClient].filter((_, i) => [relevant, irrelevant, wrongClient][i] > 0),
    options: {
      chart: { type: 'donut' as const },
      labels: ['Relevante', 'Irrelevante', 'Cliente errado'].filter(
        (_, i) => [relevant, irrelevant, wrongClient][i] > 0
      ),
      colors: ['#13DEB9', '#FA896B', '#FFAE1F'],
      legend: { position: 'bottom' as const },
    },
  };

  return (
    <AppShell title="Qualidade do Radar">
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Qualidade do Radar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Metricas de precisao, feedback e qualidade das fontes.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup value={range} exclusive onChange={(_, v) => v && setRange(v)} size="small">
              <ToggleButton value="today">Hoje</ToggleButton>
              <ToggleButton value="week">7d</ToggleButton>
              <ToggleButton value="month">30d</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={load} disabled={loading}>
              <IconRefresh size={20} />
            </IconButton>
          </Stack>
        </Stack>

        {loading && !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* KPI row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <DashboardCard>
                  <Stack alignItems="center" spacing={1}>
                    <IconTargetArrow size={28} color={precision !== null && precision >= 70 ? '#13DEB9' : '#FA896B'} />
                    <Typography variant="h4" fontWeight={700}>
                      {precision !== null ? `${precision}%` : '--'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Precisao
                    </Typography>
                  </Stack>
                </DashboardCard>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <DashboardCard>
                  <Stack alignItems="center" spacing={1}>
                    <IconThumbUp size={28} color="#13DEB9" />
                    <Typography variant="h4" fontWeight={700}>
                      {relevant}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Relevantes
                    </Typography>
                  </Stack>
                </DashboardCard>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <DashboardCard>
                  <Stack alignItems="center" spacing={1}>
                    <IconThumbDown size={28} color="#FA896B" />
                    <Typography variant="h4" fontWeight={700}>
                      {irrelevant}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Irrelevantes
                    </Typography>
                  </Stack>
                </DashboardCard>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <DashboardCard>
                  <Stack alignItems="center" spacing={1}>
                    <IconAlertTriangle size={28} color="#FFAE1F" />
                    <Typography variant="h4" fontWeight={700}>
                      {wrongClient}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cliente errado
                    </Typography>
                  </Stack>
                </DashboardCard>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Feedback donut */}
              <Grid size={{ xs: 12, md: 4 }}>
                <DashboardCard title="Feedback por tipo">
                  {data?.total_feedback ? (
                    <Chart type="donut" height={280} options={feedbackDonut.options} series={feedbackDonut.series} />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
                      Nenhum feedback registrado ainda.
                    </Typography>
                  )}
                </DashboardCard>
              </Grid>

              {/* Quality by client */}
              <Grid size={{ xs: 12, md: 8 }}>
                <DashboardCard title="Qualidade por cliente" noPadding>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Cliente</TableCell>
                          <TableCell align="right">Matches</TableCell>
                          <TableCell align="right">Score medio</TableCell>
                          <TableCell align="right">Relevantes</TableCell>
                          <TableCell align="right">Irrelevantes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data?.match_quality_by_client || []).map((row) => (
                          <TableRow key={row.client_id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {row.client_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{row.total_matches}</TableCell>
                            <TableCell align="right">{Number(row.avg_score).toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <Chip size="small" label={row.relevant} color="success" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">
                              <Chip size="small" label={row.irrelevant} color="error" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                        {!data?.match_quality_by_client?.length && (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Sem dados
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </DashboardCard>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Source quality */}
              <Grid size={{ xs: 12, md: 8 }}>
                <DashboardCard title="Qualidade por fonte" noPadding>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fonte</TableCell>
                          <TableCell align="right">Itens</TableCell>
                          <TableCell align="right">Usados</TableCell>
                          <TableCell align="right">Arquivados</TableCell>
                          <TableCell align="right">Score medio</TableCell>
                          <TableCell align="right">% Lixo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data?.source_quality || []).map((row) => (
                          <TableRow key={row.source_id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {row.source_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{row.total_items}</TableCell>
                            <TableCell align="right">
                              <Chip size="small" label={row.used} color="success" variant="outlined" />
                            </TableCell>
                            <TableCell align="right">{row.archived}</TableCell>
                            <TableCell align="right">{Number(row.avg_score || 0).toFixed(0)}</TableCell>
                            <TableCell align="right">
                              <Chip
                                size="small"
                                label={`${row.garbage_pct}%`}
                                color={Number(row.garbage_pct) > 50 ? 'error' : Number(row.garbage_pct) > 25 ? 'warning' : 'success'}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {!data?.source_quality?.length && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Sem dados
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </DashboardCard>
              </Grid>

              {/* Suggested negative keywords */}
              <Grid size={{ xs: 12, md: 4 }}>
                <DashboardCard title="Keywords negativas sugeridas">
                  <Stack spacing={1}>
                    {(data?.suggested_negative_keywords || []).length ? (
                      (data?.suggested_negative_keywords || []).map((kw) => (
                        <Stack key={kw.keyword} direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{kw.keyword}</Typography>
                          <Chip size="small" label={`${kw.count}x`} color="error" variant="outlined" />
                        </Stack>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        Nenhuma sugestao. Marque itens como irrelevantes para gerar sugestoes.
                      </Typography>
                    )}
                  </Stack>
                </DashboardCard>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </AppShell>
  );
}
