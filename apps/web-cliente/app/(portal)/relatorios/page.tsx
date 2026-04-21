'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconFileDescription, IconCircleCheck, IconArrowRight } from '@tabler/icons-react';
import { swrFetcher, apiPost } from '@/lib/api';
import type { MonthlyReport, ReportStatus } from '@/types/monthly-report';

type ListResponse = { reports: MonthlyReport[] };

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: 'default' | 'warning' | 'success' | 'info' | 'primary' }> = {
  draft:            { label: 'Rascunho',           color: 'default' },
  pending_approval: { label: 'Aguardando aprovação', color: 'warning' },
  approved:         { label: 'Aprovado',            color: 'success' },
  published:        { label: 'Publicado',           color: 'info' },
};

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function RelatoriosPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR<ListResponse>('/monthly-reports/mine', swrFetcher);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  const reports = data?.reports ?? [];

  async function handleApprove(report: MonthlyReport) {
    setApprovingId(report.id);
    try {
      await apiPost(`/monthly-reports/${report.id}/approve`);
      setApprovedIds((prev) => new Set(prev).add(report.id));
      await mutate();
    } catch {
      // silently ignore — user can retry
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <Stack spacing={3}>
      {/* Page header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.dark', display: 'flex' }}>
          <IconFileDescription size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Relatórios</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Relatórios mensais</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Leitura executiva do mês — entregas, métricas e próximos passos.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : reports.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Nenhum relatório disponível ainda.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {reports.map((report) => {
            const cfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
            const isPending = report.status === 'pending_approval';
            const isApproved = approvedIds.has(report.id);
            const isApproving = approvingId === report.id;

            return (
              <Card
                key={report.id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isPending && !isApproved ? 'warning.light' : 'divider',
                  transition: 'border-color 0.2s',
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    gap={2}
                  >
                    {/* Left: info */}
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        {formatPeriod(report.period_month)}
                      </Typography>
                      {report.client_name && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {report.client_name}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={isApproved ? 'Aprovado' : cfg.label}
                          color={isApproved ? 'success' : cfg.color}
                        />
                      </Box>
                    </Box>

                    {/* Right: actions */}
                    <Stack direction="row" spacing={1} flexShrink={0} flexWrap="wrap">
                      {isPending && !isApproved && (
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          disabled={isApproving}
                          startIcon={isApproving ? <CircularProgress size={14} color="inherit" /> : <IconCircleCheck size={16} />}
                          onClick={() => handleApprove(report)}
                          sx={{ fontWeight: 700 }}
                        >
                          Aprovar relatório
                        </Button>
                      )}
                      {isApproved && (
                        <Chip size="small" color="success" icon={<IconCircleCheck size={14} />} label="Aprovado com sucesso" />
                      )}
                      <Button
                        variant={isPending && !isApproved ? 'outlined' : 'contained'}
                        size="small"
                        endIcon={<IconArrowRight size={16} />}
                        onClick={() => router.push(`/relatorios/${report.period_month}`)}
                      >
                        Ver relatório
                      </Button>
                    </Stack>
                  </Stack>

                  {/* Pending banner */}
                  {isPending && !isApproved && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="caption" color="warning.dark" fontWeight={500}>
                        Este relatório aguarda sua aprovação antes de ir para a diretoria.
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
