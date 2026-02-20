'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BrandVoiceSection from '../analytics/sections/BrandVoiceSection';
import ContentGapSection from '../analytics/sections/ContentGapSection';

type MarcaPageProps = {
  clientId: string;
};

export default function MarcaPage({ clientId }: MarcaPageProps) {
  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h6" fontWeight={700}>Marca</Typography>
        <Typography variant="body2" color="text.secondary">Tom de voz e lacunas de conteúdo.</Typography>
      </Box>
      <BrandVoiceSection clientId={clientId} />
      <Divider />
      <ContentGapSection clientId={clientId} />
    </Stack>
  );
}
