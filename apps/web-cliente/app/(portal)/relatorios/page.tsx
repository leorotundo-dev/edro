'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
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
import { IconChartBar, IconDownload } from '@tabler/icons-react';

type Report = { id: string; period_month: string; title: string; created_at: string; pdf_url: string | null };

export default function RelatoriosPage() {
  const { data, isLoading } = useSWR<{ reports: Report[] }>('/portal/client/reports', swrFetcher);
  const reports = data?.reports ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'info.light', borderRadius: 2, color: 'info.dark', display: 'flex' }}>
          <IconChartBar size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Análise</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Relatórios</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">Documentos consolidados do trabalho entregue para sua conta.</Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : reports.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum relatório disponível ainda.</Alert>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Stack divider={<Divider />}>
              {reports.map((report) => (
                <Box key={report.id} sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2">{report.title ?? `Relatório ${report.period_month}`}</Typography>
                    <Typography variant="caption" color="text.secondary">Publicado em {new Date(report.created_at).toLocaleDateString('pt-BR')}</Typography>
                  </Box>
                  {report.pdf_url ? (
                    <Button size="small" startIcon={<IconDownload size={14} />} href={report.pdf_url} target="_blank" rel="noreferrer" variant="outlined" sx={{ flexShrink: 0 }}>Baixar PDF</Button>
                  ) : (
                    <Chip label="Sem arquivo" size="small" color="default" variant="outlined" />
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
