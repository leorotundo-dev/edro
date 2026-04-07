'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { swrFetcher } from '@/lib/api';
import { IconTrendingUp, IconDownload, IconChartBar } from '@tabler/icons-react';

type Report = { id: string; period_month: string; title: string; created_at: string; pdf_url: string | null };

// NEW endpoint — GET /portal/client/results (executive summary)
type ResultsSummary = {
  period: string;
  deliveries_count: number;
  approvals_count: number;
  highlights: string[];
  learnings: string[];
  next_moves: string[];
};

export default function ResultadosPage() {
  const router = useRouter();
  const { data: reportsData, isLoading: reportsLoading } = useSWR<{ reports: Report[] }>('/portal/client/reports', swrFetcher);
  // NEW endpoint — gracefully stub if not ready
  // GET /portal/client/results
  const { data: resultsData } = useSWR<{ summary: ResultsSummary }>('/portal/client/results', swrFetcher);

  const reports = reportsData?.reports ?? [];
  const summary = resultsData?.summary;
  const latestReport = reports[0];

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: 2, color: 'info.dark', display: 'flex' }}>
          <IconTrendingUp size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Resultados</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Resultados da conta</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Leitura executiva do trabalho entregue, o que performou e os próximos movimentos.
      </Typography>

      {reportsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : (
        <>
          {/* Executive summary block — from /portal/client/results */}
          {summary ? (
            <Card sx={{ borderRadius: 3, background: 'linear-gradient(135deg, rgba(61,90,254,0.06) 0%, rgba(61,90,254,0.01) 100%)', border: '1px solid', borderColor: 'primary.light' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">Resumo do período</Typography>
                    <Typography variant="body2" color="text.secondary">{summary.period}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={`${summary.deliveries_count} entregas`} size="small" color="primary" />
                    <Chip label={`${summary.approvals_count} aprovações`} size="small" variant="outlined" />
                  </Stack>
                </Stack>

                {summary.highlights.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>O que performou</Typography>
                    <Stack spacing={0.5}>
                      {summary.highlights.map((h, i) => (
                        <Typography key={i} variant="body2" color="text.secondary">· {h}</Typography>
                      ))}
                    </Stack>
                  </Box>
                )}

                {summary.learnings.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Aprendizados</Typography>
                    <Stack spacing={0.5}>
                      {summary.learnings.map((l, i) => (
                        <Typography key={i} variant="body2" color="text.secondary">· {l}</Typography>
                      ))}
                    </Stack>
                  </Box>
                )}

                {summary.next_moves.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Próximos passos</Typography>
                    <Stack spacing={0.5}>
                      {summary.next_moves.map((m, i) => (
                        <Typography key={i} variant="body2" color="text.secondary">· {m}</Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : latestReport ? (
            /* Fallback: show latest report as summary */
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="h6">{latestReport.title ?? `Relatório ${latestReport.period_month}`}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Publicado em {new Date(latestReport.created_at).toLocaleDateString('pt-BR')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      startIcon={<IconChartBar size={16} />}
                      variant="contained"
                      onClick={() => router.push(`/resultados/${latestReport.period_month}`)}
                    >
                      Ver relatório
                    </Button>
                    {latestReport.pdf_url && (
                      <Button
                        startIcon={<IconDownload size={16} />}
                        href={latestReport.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        variant="outlined"
                      >
                        PDF
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : null}

          {/* Full reports list */}
          {reports.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum relatório disponível ainda.</Alert>
          ) : (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Todos os relatórios</Typography>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Stack divider={<Divider />}>
                    {reports.map((report) => (
                      <Box key={report.id} sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle2">{report.title ?? `Relatório ${report.period_month}`}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Publicado em {new Date(report.created_at).toLocaleDateString('pt-BR')}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            size="small"
                            startIcon={<IconChartBar size={14} />}
                            variant="contained"
                            onClick={() => router.push(`/resultados/${report.period_month}`)}
                            sx={{ flexShrink: 0 }}
                          >
                            Ver relatório
                          </Button>
                          {report.pdf_url ? (
                            <Button
                              size="small"
                              startIcon={<IconDownload size={14} />}
                              href={report.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              variant="outlined"
                              sx={{ flexShrink: 0 }}
                            >
                              PDF
                            </Button>
                          ) : (
                            <Chip label="Sem PDF" size="small" color="default" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}
