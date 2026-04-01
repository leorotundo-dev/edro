'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

export default function PortalTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function exchange() {
      try {
        const res = await fetch(`/api/portal/token/${token}`, { cache: 'no-store' });
        if (!res.ok) {
          const text = await res.text();
          let msg = 'Link inválido ou expirado.';
          try { msg = JSON.parse(text)?.error ?? msg; } catch {}
          setError(msg);
          return;
        }
        // Session cookie already set by the API route — redirect to dashboard
        router.replace('/');
      } catch {
        setError('Erro ao autenticar. Tente novamente.');
      }
    }
    void exchange();
  }, [token, router]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Stack alignItems="center" spacing={3} sx={{ maxWidth: 360, textAlign: 'center', p: 3 }}>
        <Box component="img" src="/brand/logo-studio.png" alt="Edro Studio" sx={{ height: 28, width: 'auto' }} />
        {error ? (
          <>
            <Alert severity="error" sx={{ borderRadius: 2, width: '100%' }}>{error}</Alert>
            <Typography variant="body2" color="text.secondary">
              Peça à agência um novo link de acesso.
            </Typography>
          </>
        ) : (
          <>
            <CircularProgress size={32} color="primary" />
            <Typography variant="body2" color="text.secondary">
              Autenticando seu acesso…
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
