'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import { apiGet, apiPost, getApiBase, getBackendBase } from '@/lib/api';

function resolveNextPath() {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login')) {
    return '/';
  }
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const backendBase = getBackendBase();
  const ssoBase = backendBase || getApiBase();
  const ssoUrl = backendBase ? `${ssoBase}/api/auth/sso/start` : `${ssoBase}/auth/sso/start`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const bootstrapSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const nextPath = resolveNextPath();
      if (token) {
        localStorage.setItem('edro_token', token);
        window.history.replaceState({}, '', nextPath);
      }

      const hasToken = !!localStorage.getItem('edro_token');
      const hasRefresh = !!localStorage.getItem('edro_refresh');
      if (!hasToken && !hasRefresh) return;

      try {
        const me = await apiGet('/auth/me');
        if (cancelled) return;
        if (me?.email) {
          localStorage.setItem('edro_user', JSON.stringify(me));
        }
        router.replace(nextPath);
      } catch {
        if (cancelled) return;
        localStorage.removeItem('edro_token');
        localStorage.removeItem('edro_refresh');
        localStorage.removeItem('edro_user');
      }
    };

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRequest = async () => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const response = await apiPost('/auth/request', { email });
      if (response?.code) {
        setMessage(`Codigo gerado: ${response.code}`);
      } else {
        setMessage('Codigo enviado. Verifique seu email.');
      }
      setStep('verify');
    } catch (err: any) {
      setError(err?.message || 'Falha ao solicitar codigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const response = await apiPost('/auth/verify', { email, code });
      const token = response?.accessToken || response?.token;
      if (!token) {
        throw new Error('Token nao retornado.');
      }
      localStorage.setItem('edro_token', token);
      if (response?.refreshToken) {
        localStorage.setItem('edro_refresh', response.refreshToken);
      }
      if (response?.user) {
        localStorage.setItem('edro_user', JSON.stringify(response.user));
      }
      router.replace(resolveNextPath());
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar codigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (step === 'request') {
      await handleRequest();
    } else {
      await handleVerify();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'url(/modernize/images/backgrounds/login-bg.svg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right top',
        backgroundSize: { xs: 'cover', md: 'contain' },
        px: { xs: 2, md: 6 },
        py: { xs: 6, md: 10 },
      }}
    >
      <Grid container spacing={6} alignItems="center" sx={{ maxWidth: 1100 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box component="img" src="/modernize/images/logos/logoIcon.svg" alt="Edro" sx={{ width: 36, height: 36 }} />
              <Typography variant="h5" fontWeight={700}>
                edro studio
              </Typography>
            </Stack>
            <Typography variant="h3" fontWeight={700}>
              Acesse sua operação criativa
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Centralize briefings, calendário e inteligência editorial em um só lugar.
            </Typography>
            <Button
              variant="outlined"
              href={ssoUrl}
              sx={{ alignSelf: 'flex-start' }}
            >
              Entrar com SSO
            </Button>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ maxWidth: 420, mx: { xs: 'auto', md: 0 } }}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>
                  {step === 'verify' ? 'Validar codigo' : 'Entrar'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step === 'verify'
                    ? 'Insira o codigo enviado para seu email corporativo.'
                    : 'Digite seu email corporativo para receber o codigo de acesso.'}
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {message && <Alert severity="success">{message}</Alert>}
                <form onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <TextField
                      label="Email"
                      placeholder="name@edro.digital"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      fullWidth
                    />
                    {step === 'verify' && (
                      <TextField
                        label="Codigo"
                        placeholder="Digite o codigo"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        required
                        fullWidth
                      />
                    )}
                    <Button type="submit" variant="contained" disabled={loading} fullWidth>
                      {step === 'verify' ? 'Entrar' : 'Enviar codigo'}
                    </Button>
                    {step === 'verify' && (
                      <Button type="button" variant="text" onClick={handleRequest} disabled={loading}>
                        Reenviar codigo
                      </Button>
                    )}
                  </Stack>
                </form>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
