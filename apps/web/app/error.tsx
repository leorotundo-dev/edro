'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 4 }}>
      <Stack alignItems="center" spacing={2} sx={{ maxWidth: 400, textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontSize: '3rem', fontWeight: 900, opacity: 0.15 }}>!</Typography>
        <Typography variant="h6" fontWeight={700}>Algo deu errado</Typography>
        <Typography variant="body2" color="text.secondary">
          Esta página encontrou um erro inesperado. Tente novamente ou volte ao início.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={reset} sx={{ textTransform: 'none' }}>
            Tentar novamente
          </Button>
          <Button variant="outlined" href="/admin/operacoes" component="a" sx={{ textTransform: 'none' }}>
            Ir para Operações
          </Button>
        </Stack>
        {error?.digest && (
          <Typography variant="caption" color="text.disabled">
            Código: {error.digest}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
