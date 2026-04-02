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
import {
  IconShoppingCart,
  IconCheckbox,
  IconCalendar,
  IconArrowRight,
  IconPlus,
  IconRobot,
} from '@tabler/icons-react';

type ClientMe = { id: string; name: string; status: string };
type Job = { id: string; title: string; status: string; updated_at: string; due_at: string | null };
type Invoice = { id: string; description: string; amount_brl: string; status: string; due_date: string | null };

const JOB_STATUS_LABEL: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'info' }> = {
  backlog:     { label: 'Enviado', color: 'default' },
  todo:        { label: 'Em análise', color: 'info' },
  in_progress: { label: 'Em produção', color: 'info' },
  review:      { label: 'Aguardando aprovação', color: 'warning' },
  done:        { label: 'Entregue', color: 'success' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: meData } = useSWR<{ client: ClientMe }>('/portal/client/me', swrFetcher);
  const { data: jobsData } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);
  const { data: invoicesData } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices?limit=1', swrFetcher);

  const jobs = jobsData?.jobs ?? [];
  const firstName = meData?.client?.name?.split(' ')[0] ?? 'cliente';

  const inProgress = jobs.filter((j) => j.status === 'in_progress');
  const pendingApprovals = jobs.filter((j) => j.status === 'review');
  const upcoming = jobs
    .filter((j) => j.due_at && j.status !== 'done')
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())
    .slice(0, 3);

  const lastInvoice = invoicesData?.invoices?.[0];

  return (
    <Stack spacing={3}>
      {/* Greeting */}
      <Box>
        <Typography variant="overline" color="text.secondary">Portal do cliente</Typography>
        <Typography variant="h4" sx={{ mt: 0.25 }}>Olá, {firstName}</Typography>
        <Typography variant="body1" color="text.secondary">
          O que está acontecendo, o que depende de você e o que vem a seguir.
        </Typography>
      </Box>

      {/* KPI summary row */}
      <Grid container spacing={2}>
        {[
          {
            icon: <IconShoppingCart size={22} />,
            value: inProgress.length,
            label: 'Em produção',
            bg: 'info.light',
            color: 'info.dark',
            onClick: () => router.push('/pedidos'),
          },
          {
            icon: <IconCheckbox size={22} />,
            value: pendingApprovals.length,
            label: 'Aguardando você',
            bg: pendingApprovals.length > 0 ? 'warning.light' : 'action.hover',
            color: pendingApprovals.length > 0 ? 'warning.dark' : 'text.secondary',
            highlight: pendingApprovals.length > 0,
            onClick: () => router.push('/aprovacoes'),
          },
          {
            icon: <IconCalendar size={22} />,
            value: upcoming.length > 0
              ? new Date(upcoming[0].due_at!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              : '—',
            label: 'Próxima entrega',
            bg: 'success.light',
            color: 'success.dark',
            onClick: () => router.push('/agenda'),
          },
        ].map((kpi, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4 }}>
            <Card
              onClick={kpi.onClick}
              sx={{
                borderRadius: 3,
                cursor: 'pointer',
                ...(kpi.highlight ? { border: '1px solid', borderColor: 'warning.main' } : {}),
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.25, bgcolor: kpi.bg, borderRadius: 2, color: kpi.color, display: 'flex', flexShrink: 0 }}>
                  {kpi.icon}
                </Box>
                <Box>
                  <Typography variant="h5">{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pending approvals block */}
      {pendingApprovals.length > 0 && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.main' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6">Pendências suas</Typography>
                <Typography variant="body2" color="text.secondary">Itens que aguardam sua decisão para prosseguir.</Typography>
              </Box>
              <Chip label={`${pendingApprovals.length} item${pendingApprovals.length > 1 ? 's' : ''}`} color="warning" size="small" />
            </Stack>
            <Stack divider={<Divider />}>
              {pendingApprovals.slice(0, 3).map((job) => (
                <Box
                  key={job.id}
                  onClick={() => router.push(`/pedidos/${job.id}`)}
                  sx={{ py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, px: 1, borderRadius: 1, mx: -1 }}
                >
                  <Typography variant="subtitle2">{job.title}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="Aprovação" color="warning" size="small" variant="outlined" />
                    <IconArrowRight size={14} color="#9ca3af" />
                  </Stack>
                </Box>
              ))}
            </Stack>
            {pendingApprovals.length > 3 && (
              <Button size="small" endIcon={<IconArrowRight size={14} />} onClick={() => router.push('/aprovacoes')} sx={{ mt: 1 }}>
                Ver todas as aprovações
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* In progress jobs */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Em andamento</Typography>
            <Button size="small" endIcon={<IconArrowRight size={14} />} onClick={() => router.push('/pedidos')}>
              Ver todos
            </Button>
          </Stack>
          {!jobsData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : inProgress.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum pedido em produção no momento.</Alert>
          ) : (
            <Stack divider={<Divider />}>
              {inProgress.slice(0, 4).map((job) => {
                const st = JOB_STATUS_LABEL[job.status] ?? { label: job.status, color: 'default' as const };
                return (
                  <Box
                    key={job.id}
                    onClick={() => router.push(`/pedidos/${job.id}`)}
                    sx={{ py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, px: 1, borderRadius: 1, mx: -1 }}
                  >
                    <Box>
                      <Typography variant="subtitle2">{job.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>
                    <Chip label={st.label} color={st.color} size="small" variant="outlined" />
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Upcoming deliveries */}
      {upcoming.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Próximas entregas</Typography>
              <Button size="small" endIcon={<IconArrowRight size={14} />} onClick={() => router.push('/agenda')}>
                Ver agenda
              </Button>
            </Stack>
            <Stack spacing={1}>
              {upcoming.map((job) => (
                <Box
                  key={job.id}
                  onClick={() => router.push(`/pedidos/${job.id}`)}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'action.hover', cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' } }}
                >
                  <Typography variant="body2" fontWeight={500}>{job.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(job.due_at!).toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* CTA row */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ borderRadius: 3, bgcolor: 'primary.light', border: '1px solid', borderColor: 'primary.main', height: '100%' }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="h6" color="primary.dark">Novo pedido</Typography>
                  <Typography variant="body2" color="primary.dark" sx={{ opacity: 0.8 }}>
                    Envie um briefing e nossa equipe entra em contato em até 24h.
                  </Typography>
                </Box>
                <Button variant="contained" startIcon={<IconPlus size={16} />} onClick={() => router.push('/pedidos/novo')} sx={{ alignSelf: 'flex-start' }}>
                  Solicitar agora
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ borderRadius: 3, height: '100%', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => router.push('/assistente')}>
            <CardContent>
              <Stack spacing={1.5}>
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 2, display: 'inline-flex' }}>
                  <IconRobot size={22} />
                </Box>
                <Box>
                  <Typography variant="h6">Fale com o Assistente</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pergunte sobre pedidos, prazos, aprovações ou histórico da conta.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
