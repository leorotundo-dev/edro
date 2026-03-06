'use client';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { buildApiUrl } from '@/lib/api';

type PageState = 'loading' | 'success_approved' | 'success_rejected' | 'already_done' | 'error';

function ApprovalContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const action = searchParams.get('action') as 'approved' | 'rejected' | null;

  const [state, setState] = useState<PageState>('loading');

  useEffect(() => {
    if (!token || !action) {
      setState('error');
      return;
    }
    const url = buildApiUrl(`/edro/public/creative-approval?token=${encodeURIComponent(token)}&action=${action}`);
    fetch(url)
      .then(async (res) => {
        if (res.status === 404) { setState('already_done'); return; }
        const data = await res.json();
        if (!data.success) { setState('error'); return; }
        setState(action === 'approved' ? 'success_approved' : 'success_rejected');
      })
      .catch(() => setState('error'));
  }, [token, action]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          width: '100%',
          bgcolor: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <Typography
          sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#E85219', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 3 }}
        >
          Edro.Digital · Creative Studio
        </Typography>

        {state === 'loading' && (
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} sx={{ color: '#E85219' }} />
            <Typography sx={{ color: '#888' }}>Registrando sua resposta…</Typography>
          </Stack>
        )}

        {state === 'success_approved' && (
          <Stack alignItems="center" spacing={2}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#16a34a22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={32} color="#16a34a" />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Peça Aprovada!</Typography>
            <Typography sx={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Sua aprovação foi registrada com sucesso. A equipe criativa receberá a notificação agora.
            </Typography>
          </Stack>
        )}

        {state === 'success_rejected' && (
          <Stack alignItems="center" spacing={2}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#dc262622', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconX size={32} color="#dc2626" />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Peça Recusada</Typography>
            <Typography sx={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Sua resposta foi registrada. A equipe criativa será notificada e entrará em contato para ajustes.
            </Typography>
          </Stack>
        )}

        {state === 'already_done' && (
          <Stack alignItems="center" spacing={2}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#F8A80022', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconAlertTriangle size={32} color="#F8A800" />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Já respondido</Typography>
            <Typography sx={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Este link já foi utilizado ou expirou. Caso precise alterar sua resposta, entre em contato com a equipe.
            </Typography>
          </Stack>
        )}

        {state === 'error' && (
          <Stack alignItems="center" spacing={2}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#dc262622', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconAlertTriangle size={32} color="#dc2626" />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#fff' }}>Link inválido</Typography>
            <Typography sx={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Este link de aprovação é inválido ou expirou. Por favor, solicite um novo envio à equipe criativa.
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default function ApprovalConfirmPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#E85219' }} />
      </Box>
    }>
      <ApprovalContent />
    </Suspense>
  );
}
