'use client';

import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

export default function PlanningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Planning Error]', error);
  }, [error]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, p: 3 }}>
      <Card variant="outlined" sx={{ maxWidth: 520, width: '100%', borderColor: 'error.main' }}>
        <CardContent>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <IconAlertTriangle size={40} color="#e53935" />
            <Typography variant="h6" fontWeight={700}>
              Erro ao carregar Planning
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ocorreu um erro ao renderizar a página de planejamento.
            </Typography>
            {error?.message && (
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  p: 1.5,
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {error.message}
                </Typography>
                {error.digest && (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    digest: {error.digest}
                  </Typography>
                )}
              </Box>
            )}
            <Button
              variant="contained"
              startIcon={<IconRefresh size={16} />}
              onClick={reset}
              sx={{ bgcolor: '#ff6600', '&:hover': { bgcolor: '#e65c00' } }}
            >
              Tentar novamente
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
