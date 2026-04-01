'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconCheckbox, IconChevronRight } from '@tabler/icons-react';

type Job = { id: string; title: string; status: string; updated_at: string };

export default function AprovacoesPage() {
  const router = useRouter();
  const { data, isLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs?status=review', swrFetcher);
  const jobs = (data?.jobs ?? []).filter((j) => j.status === 'review');

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 2, color: 'warning.dark', display: 'flex' }}>
          <IconCheckbox size={22} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">Aprovações</Typography>
          <Typography variant="h4" sx={{ mt: 0 }}>Pontos que aguardam retorno</Typography>
        </Box>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Tudo o que depende da sua validação para seguir o fluxo de produção.
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : jobs.length === 0 ? (
        <Alert severity="success" sx={{ borderRadius: 2 }}>Nenhuma aprovação pendente. Tudo em dia!</Alert>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Stack divider={<Divider />}>
              {jobs.map((job) => (
                <Box key={job.id} onClick={() => router.push(`/jobs/${job.id}`)}
                  sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Box>
                    <Typography variant="subtitle2">{job.title}</Typography>
                    <Typography variant="caption" color="text.secondary">Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Chip label="Aguardando aprovação" color="warning" size="small" />
                    <IconChevronRight size={16} color="#9ca3af" />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
