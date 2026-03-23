'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function PortalExpiredPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0a0a',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 420, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          Link expirado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Este acesso nao esta mais valido. Solicite um novo link ao seu gestor de conta da Edro.
        </Typography>
        <Button component={Link} href="/" variant="outlined" sx={{ alignSelf: 'center' }}>
          Voltar para o site
        </Button>
      </Stack>
    </Box>
  );
}
