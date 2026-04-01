'use client';

import { useRouter } from 'next/navigation';
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
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconBriefcase, IconCheckbox, IconReceipt, IconArrowRight, IconPlus } from '@tabler/icons-react';

type ClientMe = { id: string; name: string; status: string };
type Job = { id: string; title: string; status: string; updated_at: string };
type Invoice = { id: string; description: string; amount_brl: string; status: string; due_date: string | null };

const JOB_STATUS: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'info' }> = {
  in_progress: { label: 'Em andamento', color: 'info' },
  review:      { label: 'Aguardando aprovação', color: 'warning' },
  done:        { label: 'Concluído', color: 'success' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: me } = useSWR<{ client: ClientMe }>('/portal/client/me', swrFetcher);
  const { data: jobsData } = useSWR<{ jobs: Job[] }>('/portal/client/jobs?limit=3', swrFetcher);
  const { data: invoicesData } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices?limit=1', swrFetcher);

  const jobs = jobsData?.jobs ?? [];
  const lastInvoice = invoicesData?.invoices?.[0];
  const firstName = me?.client?.name?.split(' ')[0] ?? 'cliente';
  const pendingApprovals = jobs.filter((j) => j.status === 'review').length;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary">Workspace cliente</Typography>
        <Typography variant="h4" sx={{ mt: 0.25 }}>Olá, {firstName}</Typography>
        <Typography variant="body1" color="text.secondary">
          Acompanhe o que está em andamento, o que precisa de aprovação e o status do seu trabalho com a agência.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {([
          { icon: <IconBriefcase size={22} />, value: jobs.length, label: 'Projetos recentes', bg: 'primary.light', color: 'primary.main', highlight: false },
          { icon: <IconCheckbox size={22} />, value: pendingApprovals, label: 'Aguardando aprovação', bg: 'warning.light', color: 'warning.dark', highlight: pendingApprovals > 0 },
          { icon: <IconReceipt size={22} />, value: lastInvoice ? parseFloat(lastInvoice.amount_brl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—', label: 'Última fatura', bg: 'success.light', color: 'success.dark', highlight: false },
        ]).map((kpi, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4 }}>
            <Card sx={{ borderRadius: 3, ...(kpi.highlight ? { border: '1px solid', borderColor: 'warning.main' } : {}) }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.25, bgcolor: kpi.bg, borderRadius: 2, color: kpi.color, display: 'flex' }}>{kpi.icon}</Box>
                <Box>
                  <Typography variant="h5">{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Projetos recentes</Typography>
            <Button size="small" endIcon={<IconArrowRight size={14} />} onClick={() => router.push('/jobs')}>Ver todos</Button>
          </Stack>
          {!jobsData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : jobs.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum projeto disponível ainda.</Alert>
          ) : (
            <Stack divider={<Divider />}>
              {jobs.map((job) => {
                const st = JOB_STATUS[job.status] ?? { label: job.status, color: 'default' as const };
                return (
                  <Box key={job.id} onClick={() => router.push(`/jobs/${job.id}`)}
                    sx={{ py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, px: 1, borderRadius: 1, mx: -1 }}>
                    <Box>
                      <Typography variant="subtitle2">{job.title}</Typography>
                      <Typography variant="caption" color="text.secondary">Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}</Typography>
                    </Box>
                    <Chip label={st.label} color={st.color} size="small" variant="outlined" />
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.main' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h6" color="primary.dark">Precisa de algo novo?</Typography>
              <Typography variant="body2" color="primary.dark" sx={{ opacity: 0.8 }}>Envie um briefing e nossa equipe entrará em contato em até 24h.</Typography>
            </Box>
            <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => router.push('/briefing/novo')} sx={{ flexShrink: 0 }}>
              Solicitar novo job
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
