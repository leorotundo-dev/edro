'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type Page = {
  id: string;
  name: string;
  picture: string | null;
  instagram_business_id: string | null;
};

export default function MetaSelectPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const errorParam = searchParams.get('error');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState(errorParam || '');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (errorParam) { setLoading(false); return; }
    if (!sessionId) { setError('Sessão inválida.'); setLoading(false); return; }

    apiGet<{ pages: Page[]; clientId: string }>(`/auth/meta/session/${sessionId}`)
      .then((res) => {
        setPages(res.pages || []);
        setClientId(res.clientId || '');
      })
      .catch(() => setError('Sessão expirada. Feche esta janela e tente novamente.'))
      .finally(() => setLoading(false));
  }, [sessionId, errorParam]);

  const selectPage = async (page: Page) => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await apiPost('/auth/meta/complete', { sessionId, pageId: page.id });
      setDone(true);
      // Notify opener and close popup
      if (window.opener) {
        window.opener.postMessage({ type: 'meta_connected', provider: 'meta' }, '*');
        window.close();
      } else {
        // Fallback: redirect to connectors page
        window.location.href = `/clients/${clientId}/connectors`;
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: 480, width: '100%', bgcolor: '#fff', borderRadius: 2, p: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ fontSize: 28 }}>📘</Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Conectar Meta</Typography>
            <Typography variant="body2" color="text.secondary">Selecione a página do cliente</Typography>
          </Box>
        </Stack>

        {/* Loading */}
        {loading && (
          <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Buscando páginas...</Typography>
          </Stack>
        )}

        {/* Error */}
        {!loading && error && (
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <Typography color="error.main" variant="body2" textAlign="center">{decodeURIComponent(error)}</Typography>
            <Button variant="outlined" size="small" onClick={() => window.close()}>Fechar</Button>
          </Stack>
        )}

        {/* Success */}
        {done && (
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <Typography color="success.main" fontWeight={700}>Conectado com sucesso!</Typography>
            <Typography variant="body2" color="text.secondary">Fechando...</Typography>
          </Stack>
        )}

        {/* Page list */}
        {!loading && !error && !done && pages.length === 0 && (
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Nenhuma página encontrada. Verifique se você é administrador de alguma página no Facebook.
            </Typography>
            <Button variant="outlined" size="small" onClick={() => window.close()}>Fechar</Button>
          </Stack>
        )}

        {!loading && !error && !done && pages.length > 0 && (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Escolha qual página vincular a este cliente:
            </Typography>
            {pages.map((page) => (
              <Button
                key={page.id}
                variant="outlined"
                fullWidth
                disabled={saving}
                onClick={() => selectPage(page)}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', py: 1.5, px: 2 }}
                startIcon={
                  <Avatar
                    src={page.picture || undefined}
                    sx={{ width: 32, height: 32, fontSize: 14 }}
                  >
                    {page.name[0]}
                  </Avatar>
                }
              >
                <Stack sx={{ ml: 1, textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={600}>{page.name}</Typography>
                  {page.instagram_business_id && (
                    <Typography variant="caption" color="text.secondary">
                      Instagram Business vinculado
                    </Typography>
                  )}
                </Stack>
                {saving && <CircularProgress size={16} sx={{ ml: 'auto' }} />}
              </Button>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
