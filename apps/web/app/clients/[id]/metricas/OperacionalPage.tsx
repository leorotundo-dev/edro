'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HealthScoreSection from '../analytics/sections/HealthScoreSection';
import GargalosSection from '../analytics/sections/GargalosSection';
import TrelloHistorySection from '../analytics/sections/TrelloHistorySection';
import ClientJobsPanel from './ClientJobsPanel';

type OperacionalPageProps = {
  clientId: string;
};

export default function OperacionalPage({ clientId }: OperacionalPageProps) {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Operacional</Typography>
        <Typography variant="body2" color="text.secondary">Saúde do fluxo e gargalos.</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Demandas & Previsões</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          ETAs calculados pela fila do responsável. Use "Copiar ETAs" para enviar ao cliente.
        </Typography>
        <ClientJobsPanel clientId={clientId} />
      </Box>
      <Divider />
      <HealthScoreSection clientId={clientId} />
      <Divider />
      <GargalosSection clientId={clientId} />
      <Divider />
      <TrelloHistorySection clientId={clientId} />
    </Stack>
  );
}
