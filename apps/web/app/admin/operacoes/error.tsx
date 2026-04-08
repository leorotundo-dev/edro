'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

export default function OperacoesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[OperacoesError]', error);
  }, [error]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        minHeight: 320,
      }}
    >
      <Stack alignItems="center" spacing={2} sx={{ maxWidth: 380, textAlign: 'center' }}>
        <Box
          sx={(theme) => ({
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.main,
          })}
        >
          <IconAlertTriangle size={24} />
        </Box>

        <Stack spacing={0.5} alignItems="center">
          <Typography variant="h6" fontWeight={800}>
            Erro nas Operações
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Esta seção encontrou um erro inesperado. Tente novamente ou recarregue a página.
          </Typography>
        </Stack>

        <Button
          variant="contained"
          disableElevation
          startIcon={<IconRefresh size={16} />}
          onClick={reset}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Tentar novamente
        </Button>

        {error?.digest && (
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
            ref: {error.digest}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
