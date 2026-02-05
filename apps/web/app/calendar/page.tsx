import { Suspense } from 'react';
import CalendarClient from './CalendarClient';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

export default function Page() {
  return (
    <Suspense
      fallback={
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 300 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Carregando calendario...
          </Typography>
        </Stack>
      }
    >
      <CalendarClient />
    </Suspense>
  );
}
