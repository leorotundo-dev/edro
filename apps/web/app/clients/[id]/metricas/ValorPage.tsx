'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BenchmarkSection from '../analytics/sections/BenchmarkSection';
import ProofOfValueSection from '../analytics/sections/ProofOfValueSection';
import RoiRetainerSection from '../analytics/sections/RoiRetainerSection';

type ValorPageProps = {
  clientId: string;
};

export default function ValorPage({ clientId }: ValorPageProps) {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Valor</Typography>
        <Typography variant="body2" color="text.secondary">ROI, benchmark e prova de valor.</Typography>
      </Box>
      <ProofOfValueSection clientId={clientId} />
      <Divider />
      <RoiRetainerSection clientId={clientId} />
      <Divider />
      <BenchmarkSection clientId={clientId} />
    </Stack>
  );
}
