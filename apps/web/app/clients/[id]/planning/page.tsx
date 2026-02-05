import { Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PlanningClient from './PlanningClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Carregando planning...
          </Typography>
        </Stack>
      }
    >
      <PlanningClient clientId={id} />
    </Suspense>
  );
}
