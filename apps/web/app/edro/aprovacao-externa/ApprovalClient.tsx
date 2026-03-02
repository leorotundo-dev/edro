'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getApiBase } from '@/lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';

type CopyItem = {
  id: string;
  output: string;
  language: string;
  created_at: string;
};

type ApprovalData = {
  briefingTitle: string;
  clientName: string;
  copies: CopyItem[];
  expiresAt: string;
};

export default function ApprovalClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ action: string; copyId: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Link inválido — token não encontrado.');
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/edro/public/approval?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'Link inválido ou expirado.');
          return;
        }
        setData(json.data);
      } catch {
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  async function handleAction(copyId: string, action: 'approve' | 'reject') {
    setSubmitting(copyId + action);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/edro/public/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, copyId, action, comments: comments[copyId] || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Erro ao enviar resposta.');
        return;
      }
      setDone({ action, copyId });
    } catch {
      setError('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '100vh' }}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Carregando...
        </Typography>
      </Stack>
    );
  }

  if (error && !data) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, px: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, px: 2 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {done.action === 'approve' ? 'Copy Aprovada!' : 'Revisão Solicitada'}
            </Typography>
            <Typography color="text.secondary">
              {done.action === 'approve'
                ? 'Obrigado! A copy aprovada já foi encaminhada para produção.'
                : 'Obrigado pelo feedback! A equipe vai revisar e enviar uma nova versão.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!data) return null;

  const expiresDate = new Date(data.expiresAt);
  const isExpired = expiresDate < new Date();

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: 'auto',
        py: 4,
        px: 2,
        minHeight: '100vh',
        bgcolor: 'var(--surface-0, #fafafa)',
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          Aprovação de Copy
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {data.clientName && (
            <>
              Cliente: <strong>{data.clientName}</strong> &middot;{' '}
            </>
          )}
          Briefing: <strong>{data.briefingTitle}</strong>
        </Typography>
        {!isExpired && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Link valido ate {expiresDate.toLocaleDateString('pt-BR')}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isExpired && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este link de aprovação expirou. Solicite um novo link à equipe.
        </Alert>
      )}

      {/* Copy cards */}
      <Stack spacing={3}>
        {data.copies.map((copy, i) => {
          let parsed: Record<string, string> | null = null;
          try {
            parsed = typeof copy.output === 'string' ? JSON.parse(copy.output) : copy.output;
          } catch {
            /* not JSON */
          }

          return (
            <Card key={copy.id} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="h6">Versão {i + 1}</Typography>
                  {copy.language && <Chip label={copy.language} size="small" />}
                  <Typography variant="caption" color="text.secondary">
                    {new Date(copy.created_at).toLocaleDateString('pt-BR')}
                  </Typography>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {parsed && typeof parsed === 'object' ? (
                  <Stack spacing={2}>
                    {Object.entries(parsed).map(([key, value]) => (
                      <Box key={key}>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color="text.secondary"
                          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                        >
                          {key}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: 'pre-wrap', mt: 0.5, lineHeight: 1.6 }}
                        >
                          {String(value)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {String(copy.output)}
                  </Typography>
                )}

                {!isExpired && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <TextField
                      label="Comentarios (opcional)"
                      multiline
                      rows={2}
                      fullWidth
                      size="small"
                      value={comments[copy.id] || ''}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [copy.id]: e.target.value }))
                      }
                      sx={{ mb: 2 }}
                    />
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleAction(copy.id, 'approve')}
                        disabled={!!submitting}
                      >
                        {submitting === copy.id + 'approve' ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          'Aprovar'
                        )}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleAction(copy.id, 'reject')}
                        disabled={!!submitting}
                      >
                        {submitting === copy.id + 'reject' ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          'Solicitar Revisão'
                        )}
                      </Button>
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {data.copies.length === 0 && (
        <Alert severity="info">Nenhuma copy disponível para aprovação neste briefing.</Alert>
      )}

      {/* Footer */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 4 }}
      >
        Powered by Edro.Digital
      </Typography>
    </Box>
  );
}
