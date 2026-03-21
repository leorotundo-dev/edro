'use client';

import useSWR from 'swr';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { apiGet } from '@/lib/api';

type RatingRow = {
  job_id: string;
  job_title: string;
  client_name: string | null;
  rating_count: number;
  avg_briefing_quality: number;
  avg_overall_experience: number;
  last_rated_at: string;
};

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="caption" fontWeight={700} color={value >= 4 ? 'success.main' : value >= 3 ? 'warning.main' : 'error.main'}>
        {value.toFixed(1)}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      </Typography>
    </Stack>
  );
}

function QualityBand({ score }: { score: number }) {
  if (score >= 4.5) return <Chip label="Excelente" size="small" color="success" />;
  if (score >= 3.5) return <Chip label="Bom" size="small" color="primary" />;
  if (score >= 2.5) return <Chip label="Regular" size="small" color="warning" />;
  return <Chip label="Fraco" size="small" color="error" />;
}

export default function BriefingRatingsPage() {
  const { data, isLoading } = useSWR<{ ratings: RatingRow[]; total_jobs: number; avg_briefing_quality: number; avg_overall_experience: number }>(
    '/freelancers/admin/briefing-ratings',
    (url: string) => apiGet(url),
    { refreshInterval: 60000 },
  );

  const ratings = data?.ratings ?? [];
  const avgBQ = data?.avg_briefing_quality ?? 0;
  const avgOE = data?.avg_overall_experience ?? 0;
  const criticalJobs = ratings.filter((r) => r.avg_briefing_quality < 3);

  return (
    <AppShell title="Avaliações de Briefing">
      <Box sx={{ p: 3, maxWidth: 1100 }}>
        <Typography variant="h5" fontWeight={800} mb={0.5}>Avaliação Reversa</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Freelancers avaliam a qualidade dos briefings após a entrega. Use para identificar jobs com briefing fraco.
        </Typography>

        {isLoading ? (
          <Stack alignItems="center" py={6}><CircularProgress /></Stack>
        ) : (
          <>
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Jobs avaliados', value: String(data?.total_jobs ?? 0), color: 'text.primary' },
                { label: 'Qualidade média do briefing', value: avgBQ > 0 ? `${avgBQ.toFixed(1)} ★` : '—', color: avgBQ >= 4 ? 'success.main' : avgBQ >= 3 ? 'warning.main' : 'error.main' },
                { label: 'Experiência geral média', value: avgOE > 0 ? `${avgOE.toFixed(1)} ★` : '—', color: avgOE >= 4 ? 'success.main' : avgOE >= 3 ? 'warning.main' : 'error.main' },
                { label: 'Briefings críticos (< 3)', value: String(criticalJobs.length), color: criticalJobs.length > 0 ? 'error.main' : 'success.main' },
              ].map((s) => (
                <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: '12px !important', px: 2 }}>
                      <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {criticalJobs.length > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                {criticalJobs.length} job{criticalJobs.length !== 1 ? 's' : ''} com briefing avaliado abaixo de 3 pontos. Revise o processo de briefing desses clientes.
              </Alert>
            )}

            {ratings.length === 0 ? (
              <Alert severity="info">Nenhuma avaliação recebida ainda. Freelancers avaliam ao concluir jobs aprovados.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Job</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Avaliações</TableCell>
                      <TableCell>Qualidade briefing</TableCell>
                      <TableCell>Experiência geral</TableCell>
                      <TableCell>Classificação</TableCell>
                      <TableCell>Última avaliação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ratings.map((r) => (
                      <TableRow key={r.job_id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{r.job_title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{r.client_name ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>{r.rating_count}</TableCell>
                        <TableCell><Stars value={r.avg_briefing_quality} /></TableCell>
                        <TableCell><Stars value={r.avg_overall_experience} /></TableCell>
                        <TableCell><QualityBand score={r.avg_briefing_quality} /></TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(r.last_rated_at).toLocaleDateString('pt-BR')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>
    </AppShell>
  );
}
