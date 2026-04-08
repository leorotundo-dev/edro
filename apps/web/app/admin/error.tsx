'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconAlertTriangle, IconHome, IconRefresh } from '@tabler/icons-react';

const SIDEBAR_WIDTH = 260;
const HEADER_HEIGHT = 64;

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring — replace with Sentry/Datadog when integrated
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar placeholder — keeps layout stable */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
        }}
      />

      {/* Main area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header placeholder */}
        <Box
          sx={{
            height: HEADER_HEIGHT,
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        />

        {/* Error content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <Stack alignItems="center" spacing={2.5} sx={{ maxWidth: 440, textAlign: 'center' }}>
            <Box
              sx={(theme) => ({
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              })}
            >
              <IconAlertTriangle size={28} />
            </Box>

            <Stack spacing={0.75} alignItems="center">
              <Typography variant="h6" fontWeight={800}>
                Algo deu errado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Esta seção encontrou um erro inesperado. Seus dados estão seguros — tente novamente ou volte ao início.
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disableElevation
                startIcon={<IconRefresh size={16} />}
                onClick={reset}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Tentar novamente
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconHome size={16} />}
                href="/admin/operacoes"
                component="a"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Operações
              </Button>
            </Stack>

            {error?.digest && (
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                ref: {error.digest}
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
