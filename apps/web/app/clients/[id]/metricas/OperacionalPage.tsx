'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HealthScoreSection from '../analytics/sections/HealthScoreSection';
import GargalosSection from '../analytics/sections/GargalosSection';

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
      <HealthScoreSection clientId={clientId} />
      <Divider />
      <GargalosSection clientId={clientId} />
    </Stack>
  );
}
