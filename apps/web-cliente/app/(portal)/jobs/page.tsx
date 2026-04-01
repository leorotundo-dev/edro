'use client';

import { useState } from 'react';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { IconChevronRight } from '@tabler/icons-react';

type Job = { id: string; title: string; status: string; updated_at: string; copy_approved_at: string | null };

const STATUS_MAP: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' }> = {
  backlog:     { label: 'Backlog', color: 'default' },
  todo:        { label: 'A fazer', color: 'default' },
  in_progress: { label: 'Em andamento', color: 'info' },
  review:      { label: 'Aguardando aprovação', color: 'warning' },
  done:        { label: 'Concluído', color: 'success' },
};

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'review', label: 'Aprovação' },
  { value: 'done', label: 'Concluídos' },
];

export default function JobsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const { data, isLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);
  const allJobs = data?.jobs ?? [];
  const jobs = filter === 'all' ? allJobs : allJobs.filter((j) => j.status === filter);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="text.secondary">Projetos</Typography>
        <Typography variant="h4" sx={{ mt: 0.25 }}>Visão completa dos jobs</Typography>
        <Typography variant="body1" color="text.secondary">Todos os itens disponibilizados para sua conta, com status de produção e aprovação.</Typography>
      </Box>

      <ToggleButtonGroup value={filter} exclusive onChange={(_, v) => { if (v) setFilter(v); }} size="small">
        {FILTERS.map((f) => <ToggleButton key={f.value} value={f.value}>{f.label}</ToggleButton>)}
      </ToggleButtonGroup>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : jobs.length === 0 ? (
            <Box sx={{ p: 3 }}><Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum projeto encontrado.</Alert></Box>
          ) : (
            <Stack divider={<Divider />}>
              {jobs.map((job) => {
                const st = STATUS_MAP[job.status] ?? { label: job.status, color: 'default' as const };
                return (
                  <Box key={job.id} onClick={() => router.push(`/jobs/${job.id}`)}
                    sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box sx={{ minWidth: 0, mr: 2 }}>
                      <Typography variant="subtitle2" noWrap>{job.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                        {job.copy_approved_at ? ' · Copy aprovada' : ''}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Chip label={st.label} color={st.color} size="small" variant="outlined" />
                      <IconChevronRight size={16} color="#9ca3af" />
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
