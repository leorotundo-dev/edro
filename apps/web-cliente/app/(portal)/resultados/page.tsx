'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';
import useSWR from 'swr';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api';
import {
  IconTrendingUp,
  IconSparkles,
  IconBulb,
  IconChevronRight,
  IconCalendar,
} from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthlyReport = {
  id: string;
  period_month: string;
  title: string;
  status: 'pending_approval' | 'approved' | 'published';
  published_at: string | null;
  generated_at: string;
};

type ResultsSummary = {
  period: string;
  deliveries_count: number;
  approvals_count: number;
  highlights: string[];
  learnings: string[];
  next_moves: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const label = new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResultadosPage() {
  const { data: reportsData, isLoading: reportsLoading } =
    useSWR<{ reports: MonthlyReport[] }>('/monthly-reports/mine', swrFetcher);

  const { data: resultsData, isLoading: summaryLoading } =
    useSWR<{ summary: ResultsSummary }>('/portal/client/results', swrFetcher);

  const reports = reportsData?.reports ?? [];
  const summary = resultsData?.summary;
  const loading  = reportsLoading || summaryLoading;

  return (
    <Stack spacing={3}>
      {/* ── Header ── */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'info.light',
            borderRadius: 2,
            color: 'info.dark',
            display: 'flex',
          }}
        >
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {/* ── AI Executive Summary ── */}
          {summary && (summary.highlights.length > 0 || summary.learnings.length > 0 || summary.next_moves.length > 0) && (
            <Card
              sx={{
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(61,90,254,0.06) 0%, rgba(61,90,254,0.01) 100%)',
                border: '1px solid',
                borderColor: 'primary.light',
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: 'primary.main' }}>
                      <IconSparkles size={20} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>Resumo inteligente</Typography>
                      <Typography variant="caption" color="text.secondary">{summary.period}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Chip label={`${summary.deliveries_count} entregas`} size="small" color="primary" />
                    <Chip label={`${summary.approvals_count} aprovações`} size="small" variant="outlined" />
                  </Stack>
                </Stack>

                <Stack spacing={2.5} divider={<Divider />}>
                  {summary.highlights.length > 0 && (
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'success.main', display: 'block', mb: 1 }}
                      >
                        O QUE PERFORMOU
                      </Typography>
                      <Stack spacing={0.75}>
                        {summary.highlights.map((h, i) => (
                          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                            <Box
                              sx={{
                                width: 6, height: 6, borderRadius: '50%',
                                bgcolor: 'success.main', mt: '7px', flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" color="text.primary">{h}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {summary.learnings.length > 0 && (
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'warning.main', display: 'block', mb: 1 }}
                      >
                        APRENDIZADOS
                      </Typography>
                      <Stack spacing={0.75}>
                        {summary.learnings.map((l, i) => (
                          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                            <Box
                              sx={{
                                color: 'warning.main', mt: '2px', flexShrink: 0,
                              }}
                            >
                              <IconBulb size={14} />
                            </Box>
                            <Typography variant="body2" color="text.primary">{l}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {summary.next_moves.length > 0 && (
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'primary.main', display: 'block', mb: 1 }}
                      >
                        PRÓXIMOS PASSOS
                      </Typography>
                      <Stack spacing={0.75}>
                        {summary.next_moves.map((m, i) => (
                          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                            <Typography
                              sx={{
                                fontWeight: 900, fontSize: '0.75rem', color: 'primary.main',
                                minWidth: 18, lineHeight: '20px',
                              }}
                            >
                              {i + 1}.
                            </Typography>
                            <Typography variant="body2" color="text.primary">{m}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* ── Monthly Reports List ── */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5 }}>
              Relatórios mensais publicados
            </Typography>

            {reports.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Nenhum relatório publicado ainda. Os relatórios mensais aparecem aqui após a revisão da equipe.
              </Alert>
            ) : (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Stack divider={<Divider />}>
                    {reports.map((report) => (
                      <Box
                        key={report.id}
                        sx={{
                          px: 3,
                          py: 2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1,
                          transition: 'background-color 0.15s',
                          '&:hover': { bgcolor: alpha('#5D87FF', 0.03) },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box sx={{ color: 'text.disabled' }}>
                            <IconCalendar size={18} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {monthLabel(report.period_month)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.published_at
                                ? `Publicado em ${new Date(report.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                : report.status === 'pending_approval'
                                  ? 'Aguardando sua aprovação'
                                  : 'Em preparação'}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center">
                          {report.status === 'pending_approval' && (
                            <Chip label="Aguarda aprovação" size="small" color="warning" />
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            endIcon={<IconChevronRight size={14} />}
                            component={Link}
                            href={`/relatorios/${report.period_month}`}
                            sx={{ fontWeight: 700, fontSize: '0.78rem' }}
                          >
                            Ver relatório
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
