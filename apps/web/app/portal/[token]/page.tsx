'use client';
/**
 * Portal do Cliente — Magic Link Landing
 * Receives the token from the URL, exchanges it for a client JWT,
 * stores it in sessionStorage, and redirects to /portal/dashboard.
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { buildApiUrl } from '@/lib/api';

export default function PortalTokenPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); return; }

    const url = buildApiUrl(`/portal/token/${encodeURIComponent(token)}`);
    fetch(url)
      .then(async (res) => {
        if (res.status === 404) throw new Error('Link inválido ou não encontrado.');
        if (res.status === 410) throw new Error('Este link expirou. Solicite um novo link ao seu gestor de conta.');
        if (!res.ok) throw new Error('Erro ao autenticar. Tente novamente.');
        const data = await res.json() as { token: string; clientName: string };
        // Store client JWT in sessionStorage (portal-only, not mixed with admin token)
        sessionStorage.setItem('portal_token', data.token);
        sessionStorage.setItem('portal_client_name', data.clientName ?? '');
        router.replace('/portal/dashboard');
      })
      .catch((err: Error) => setError(err.message));
  }, [token, router]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {error ? (
        <Stack alignItems="center" spacing={2} sx={{ maxWidth: 380, px: 3, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={700} color="error.main">
            Link inválido
          </Typography>
          <Typography variant="body2" color="text.secondary">{error}</Typography>
        </Stack>
      ) : (
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={32} sx={{ color: '#E85219' }} />
          <Typography variant="body2" color="text.secondary">Carregando seu portal…</Typography>
        </Stack>
      )}
    </Box>
  );
}
