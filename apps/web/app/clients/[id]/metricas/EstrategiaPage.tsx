'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EstrategistaSection from '../analytics/sections/EstrategistaSection';
import PredictiveCalendarSection from '../analytics/sections/PredictiveCalendarSection';

type EstrategiaPageProps = {
  clientId: string;
};

export default function EstrategiaPage({ clientId }: EstrategiaPageProps) {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Estratégia</Typography>
        <Typography variant="body2" color="text.secondary">Planejamento mensal e calendário preditivo.</Typography>
      </Box>
      <EstrategistaSection clientId={clientId} />
      <Divider />
      <PredictiveCalendarSection clientId={clientId} />
    </Stack>
  );
}
