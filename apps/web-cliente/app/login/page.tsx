'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { clearToken } from '@/lib/api';

const FEATURES = ['Aprovações centralizadas', 'Projetos em tempo real', 'Relatórios e faturas', 'Contexto direto com a agência'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role: 'client' }) });
      if (!res.ok) throw new Error(await res.text());
      setSent(true);
    } catch (err: any) { setError(err.message ?? 'Erro ao enviar link'); } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/magic-link/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: token, role: 'client' }) });
      if (!res.ok) throw new Error(await res.text());
      clearToken(); window.location.href = '/';
    } catch (err: any) { setError(err.message ?? 'Token inválido ou expirado'); } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {/* Left — brand */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', width: '55%', bgcolor: 'primary.main', p: 6, color: 'white' }}>
        <Box component="img" src="/brand/logo-studio-white.png" alt="Edro Studio" onError={(e: any) => { e.target.style.display = 'none'; }} sx={{ height: 28, width: 'auto', objectFit: 'contain', alignSelf: 'flex-start' }} />
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: '0.12em' }}>Workspace cliente</Typography>
          <Typography variant="h2" sx={{ color: 'white', mt: 1, mb: 2, fontWeight: 700, lineHeight: 1.15 }}>
            Seus projetos,<br />suas aprovações,<br />em um só lugar.
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, maxWidth: 400 }}>
            Acompanhe o andamento do trabalho, aprove entregas e consulte relatórios sem precisar de WhatsApp ou e-mail.
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {FEATURES.map((f) => (
              <Chip key={f} label={f} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 500, border: '1px solid rgba(255,255,255,0.25)' }} />
            ))}
          </Stack>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.5 }}>Edro.Digital · operação orientada por contexto</Typography>
      </Box>

      {/* Right — form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4, textAlign: 'center' }}>
            <Box component="img" src="/brand/logo-studio.png" alt="Edro Studio" sx={{ height: 28, width: 'auto' }} />
          </Box>
          <Typography variant="overline" color="text.secondary">Acesso seguro</Typography>
          <Typography variant="h4" sx={{ mt: 0.5, mb: 0.75 }}>{sent ? 'Valide o código' : 'Entrar no portal'}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {sent ? `Use o código enviado para ${email} para concluir o acesso.` : 'Digite o email autorizado para receber o link de acesso.'}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              {!sent ? (
                <Stack component="form" onSubmit={handleRequestLink} spacing={2}>
                  <TextField label="Email" type="email" required fullWidth value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" autoFocus />
                  <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                    {loading ? 'Enviando...' : 'Enviar link de acesso'}
                  </Button>
                </Stack>
              ) : (
                <Stack component="form" onSubmit={handleVerify} spacing={2}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>Verifique seu email e cole o código abaixo.</Alert>
                  <TextField label="Código" required fullWidth value={token} onChange={(e) => setTokenInput(e.target.value)} placeholder="Cole o código aqui" autoFocus />
                  <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                    {loading ? 'Validando...' : 'Entrar'}
                  </Button>
                  <Button variant="text" size="small" onClick={() => setSent(false)} sx={{ color: 'text.secondary' }}>Reenviar link</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
