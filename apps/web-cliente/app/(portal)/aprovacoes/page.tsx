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
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconCheckbox, IconChevronRight, IconCheck } from '@tabler/icons-react';

type Job = { id: string; title: string; status: string; updated_at: string; due_at: string | null };

export default function AprovacoesPage() {
  const router = useRouter();
  const { data: jobsData, isLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);

  const allJobs = jobsData?.jobs ?? [];
  const pendingJobs = allJobs.filter((j) => j.status === 'review');
  const doneJobs = allJobs.filter((j) => j.status === 'done').slice(0, 5);

  const hasPending = pendingJobs.length > 0;

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            p: 1.5,
            bgcolor: hasPending ? 'warning.light' : 'success.light',
            borderRadius: 2,
            color: hasPending ? 'warning.dark' : 'success.dark',
            display: 'flex',
          }}
        >
          <IconCheckbox size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Aprovações</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Fila de aprovações</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Tudo que depende da sua validação para seguir o fluxo de produção.
      </Typography>

      {/* Status bar */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip
          label={`${pendingJobs.length} pendente${pendingJobs.length !== 1 ? 's' : ''}`}
          color={hasPending ? 'warning' : 'default'}
          size="small"
        />
        <Chip
          label={`${doneJobs.length} entregue${doneJobs.length !== 1 ? 's' : ''} recentemente`}
          color="success"
          size="small"
          variant="outlined"
        />
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : !hasPending ? (
        <Alert
          severity="success"
          icon={<IconCheck size={20} />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle2">Nenhuma aprovação pendente</Typography>
          <Typography variant="caption">Tudo em dia! Você será notificado quando algo precisar da sua aprovação.</Typography>
        </Alert>
      ) : (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.main' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Stack divider={<Divider />}>
              {pendingJobs.map((job) => {
                const daysUntil = job.due_at
                  ? Math.ceil((new Date(job.due_at).getTime() - Date.now()) / 86400000)
                  : null;
                const urgentDeadline = daysUntil !== null && daysUntil <= 2;
                return (
                  <Box
                    key={job.id}
                    onClick={() => router.push(`/pedidos/${job.id}`)}
                    sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.25 }}>{job.title}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Última atualização: {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                      </Typography>
                      {job.due_at && (
                        <Typography variant="caption" color={urgentDeadline ? 'error.main' : 'text.secondary'} display="block" sx={{ mt: 0.25 }}>
                          Prazo de entrega: {new Date(job.due_at).toLocaleDateString('pt-BR')}
                          {daysUntil !== null && ` (${daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`})`}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={(e) => { e.stopPropagation(); router.push(`/pedidos/${job.id}`); }}
                        >
                          Aprovar agora
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => { e.stopPropagation(); router.push(`/pedidos/${job.id}`); }}
                        >
                          Ver detalhes
                        </Button>
                      </Stack>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.75} sx={{ flexShrink: 0 }}>
                      <Chip label="Aguardando aprovação" color="warning" size="small" />
                      {urgentDeadline && <Chip label="Urgente" color="error" size="small" />}
                      <IconChevronRight size={16} color="#9ca3af" />
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Recent deliveries for context */}
      {doneJobs.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Aprovados recentemente</Typography>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Stack divider={<Divider />}>
                {doneJobs.map((job) => (
                  <Box
                    key={job.id}
                    onClick={() => router.push(`/pedidos/${job.id}`)}
                    sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Typography variant="body2" noWrap sx={{ mr: 2 }}>{job.title}</Typography>
                    <Chip label="Entregue" color="success" size="small" variant="outlined" />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </Stack>
  );
}
