'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconAlertTriangle,
  IconCheck,
  IconClockBolt,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { apiGet } from '@/lib/api';

type SlaData = {
  period_days: number;
  overall: {
    met: number; missed: number; open: number; total: number;
    rate: number | null; avg_days_variance: number;
    avg_actual_minutes: number; avg_estimated_minutes: number;
  };
  by_client: { client_id: string | null; client_name: string; met: number; missed: number; total: number; rate: number | null; avg_days_variance: number }[];
  by_owner: { owner_id: string | null; owner_name: string; met: number; missed: number; total: number; rate: number | null; avg_days_variance: number; avg_revisions: number }[];
  by_type: { type_key: string; type_label: string; met: number; missed: number; total: number; rate: number | null; avg_days_variance: number }[];
  worst_misses: { job_id: string; title: string; client_name: string; owner_name: string; priority_band: string; deadline_at: string; completed_at: string; days_variance: number; revision_count: number }[];
};

function RateBar({ rate, total }: { rate: number | null; total: number }) {
  if (total === 0) return <Typography variant="caption" color="text.disabled">— sem dados</Typography>;
  const pct = rate ?? 0;
  const color = pct >= 85 ? '#13DEB9' : pct >= 65 ? '#FFAE1F' : '#FA896B';
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" fontWeight={800} sx={{ color }}>{pct}%</Typography>
        <Typography variant="caption" color="text.secondary">{total} entregues</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 5, borderRadius: 99, bgcolor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Stack>
  );
}

export default function SlaClient({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();
  const [days, setDays] = useState('90');
  const [data, setData] = useState<SlaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiGet<{ data: SlaData }>(`/trello/ops-sla?days=${days}`);
      setData(res?.data ?? null);
    } catch (e: any) { setError(e?.message || 'Erro ao carregar SLA.'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const fmtMins = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? m % 60 + 'min' : ''}`.trim() : `${m}min`;

  const content = (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <Typography variant="h6" fontWeight={800}>Rastreamento de SLA</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField select size="small" value={days} onChange={(e) => setDays(e.target.value)} sx={{ width: 140 }}>
          {[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias'], ['180', '6 meses'], ['365', '1 ano']].map(([v, l]) => (
            <MenuItem key={v} value={v}>{l}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : data ? (
        <Stack spacing={3}>
          {/* Overall */}
          <Grid container spacing={2}>
            {[
              { label: 'Taxa no prazo', value: data.overall.rate !== null ? `${data.overall.rate}%` : '—', icon: <IconCheck size={22} />, color: data.overall.rate !== null && data.overall.rate >= 85 ? '#13DEB9' : data.overall.rate !== null && data.overall.rate >= 65 ? '#FFAE1F' : '#FA896B' },
              { label: 'Entregues no prazo', value: String(data.overall.met), icon: <IconTrendingUp size={22} />, color: '#13DEB9' },
              { label: 'Perderam o prazo', value: String(data.overall.missed), icon: <IconAlertTriangle size={22} />, color: '#FA896B' },
              { label: 'Variância média', value: data.overall.avg_days_variance > 0 ? `+${data.overall.avg_days_variance}d` : `${data.overall.avg_days_variance}d`, icon: <IconClockBolt size={22} />, color: data.overall.avg_days_variance <= 0 ? '#13DEB9' : '#FFAE1F' },
            ].map((s) => (
              <Grid key={s.label} size={{ xs: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(s.color, 0.12), color: s.color, flexShrink: 0 }}>
                        {s.icon}
                      </Box>
                      <Box>
                        <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Estimação vs real */}
          {data.overall.avg_actual_minutes > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Estimativa vs Tempo real</Typography>
                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{fmtMins(data.overall.avg_estimated_minutes)}</Typography>
                    <Typography variant="caption" color="text.secondary">Estimado (média)</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{fmtMins(data.overall.avg_actual_minutes)}</Typography>
                    <Typography variant="caption" color="text.secondary">Real (média)</Typography>
                  </Box>
                  <Box>
                    {data.overall.avg_actual_minutes > data.overall.avg_estimated_minutes
                      ? <IconTrendingUp color="#FA896B" size={20} />
                      : <IconTrendingDown color="#13DEB9" size={20} />}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      {Math.round(Math.abs(data.overall.avg_actual_minutes - data.overall.avg_estimated_minutes))}min de diferença
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Grid container spacing={2.5}>
            {/* By client */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>SLA por cliente</Typography>
                  <Stack spacing={1.5}>
                    {data.by_client.length === 0
                      ? <Typography variant="caption" color="text.disabled">Sem dados</Typography>
                      : data.by_client.map((c) => (
                        <Box key={c.client_id || c.client_name}>
                          <Typography variant="caption" fontWeight={700} noWrap>{c.client_name || 'Sem cliente'}</Typography>
                          <RateBar rate={c.rate} total={c.met + c.missed} />
                        </Box>
                      ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* By owner */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>SLA por responsável</Typography>
                  <Stack spacing={1.5}>
                    {data.by_owner.length === 0
                      ? <Typography variant="caption" color="text.disabled">Sem dados</Typography>
                      : data.by_owner.map((o) => (
                        <Box key={o.owner_id || o.owner_name}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" fontWeight={700} noWrap>{o.owner_name || 'Sem responsável'}</Typography>
                            {o.avg_revisions > 0 && (
                              <Chip label={`${o.avg_revisions}x revisão`} size="small" sx={{ fontSize: '0.6rem', height: 16, bgcolor: alpha(theme.palette.warning.main, 0.12), color: 'warning.main' }} />
                            )}
                          </Stack>
                          <RateBar rate={o.rate} total={o.met + o.missed} />
                        </Box>
                      ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>SLA por tipo de entrega</Typography>
                  <Stack spacing={1.5}>
                    {data.by_type.length === 0
                      ? <Typography variant="caption" color="text.disabled">Sem dados</Typography>
                      : data.by_type.map((item) => (
                        <Box key={item.type_key}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} noWrap>{item.type_label}</Typography>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Chip
                                label={item.missed > 0 ? `+${item.avg_days_variance}d` : 'sem atraso'}
                                size="small"
                                sx={{
                                  fontSize: '0.64rem',
                                  height: 18,
                                  bgcolor: item.missed > 0 ? alpha('#FFAE1F', 0.12) : alpha('#13DEB9', 0.12),
                                  color: item.missed > 0 ? '#d97706' : '#0f766e',
                                }}
                              />
                              <Typography variant="caption" color="text.secondary">{item.met + item.missed} entregas</Typography>
                            </Stack>
                          </Stack>
                          <RateBar rate={item.rate} total={item.met + item.missed} />
                        </Box>
                      ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Worst misses */}
          {data.worst_misses.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Maiores atrasos ({data.worst_misses.length})</Typography>
                <Stack spacing={0}>
                  {data.worst_misses.map((j) => (
                    <Stack key={j.job_id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ py: 1, borderBottom: `1px solid ${theme.palette.divider}` }} spacing={1}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{j.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{j.client_name} · {j.owner_name}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexShrink={0}>
                        <Chip label={`+${Math.round(j.days_variance)}d`} size="small" sx={{ bgcolor: alpha('#FA896B', 0.1), color: '#FA896B', fontWeight: 700 }} />
                        {j.revision_count > 0 && <Chip label={`${j.revision_count}x rev`} size="small" variant="outlined" />}
                        <Chip label={j.priority_band.toUpperCase()} size="small" variant="outlined" />
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      ) : null}
    </>
  );

  if (embedded) return content;

  return (
    <OperationsShell section="quality" summary={data ? (
      <Typography variant="caption" fontWeight={700} color="text.secondary">
        {data.overall.rate !== null ? `${data.overall.rate}% no prazo` : 'Sem dados'} · {data.overall.total} demandas · {days}d
      </Typography>
    ) : undefined}>
      {content}
    </OperationsShell>
  );
}
