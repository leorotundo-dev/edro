import { Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ClippingClient from './ClippingClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Carregando clipping...
          </Typography>
        </Stack>
      }
    >
      <ClippingClient />
    </Suspense>
  );
}
