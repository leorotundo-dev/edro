'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { apiGet, apiPost, getApiBase, getBackendBase } from '@/lib/api';

const FEATURES = [
  'Briefing com IA',
  'Copy generativa',
  'Arte IA',
  'Calendário editorial',
  'Social Listening',
  'Analytics',
];

const PROVIDERS = [
  { name: 'Claude',  sub: 'Anthropic', dot: 'bg-[#cc785c]' },
  { name: 'Gemini',  sub: 'Google',    dot: 'bg-[#4285f4]' },
  { name: 'GPT-4o',  sub: 'OpenAI',    dot: 'bg-[#10a37f]' },
  { name: 'Tavily',  sub: 'Search',    dot: 'bg-[#7c3aed]' },
];

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
    return () => { cancelled = true; };
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
      if (!token) throw new Error('Token não retornado.');
      localStorage.setItem('edro_token', token);
      if (response?.refreshToken) localStorage.setItem('edro_refresh', response.refreshToken);
      if (response?.user) localStorage.setItem('edro_user', JSON.stringify(response.user));
      router.replace(resolveNextPath());
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar codigo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (step === 'request') await handleRequest();
    else await handleVerify();
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">

      {/* ── Left: Hero ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 px-16 py-12 relative overflow-hidden">

        {/* Glow */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(232,82,25,0.10)_0%,transparent_70%)] pointer-events-none" />

        {/* Logo */}
        <div>
          <img src="/brand/logo-studio.png" alt="edro.studio" className="h-7 w-auto" />
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
            <span className="text-[11px] font-semibold text-orange-400 tracking-[0.05em] uppercase">
              Plataforma de IA para agências
            </span>
          </div>

          <h1 className="font-serif font-normal text-white leading-[1.05] tracking-[-0.02em] mb-6 text-[clamp(36px,3.8vw,60px)]">
            A inteligência que<br />
            <em className="text-orange-500 italic">move</em> sua agência.
          </h1>

          <p className="text-slate-400 text-[15px] leading-relaxed max-w-[440px] mb-10">
            De briefings a publicação — copy, arte IA, calendário editorial e métricas em um único sistema.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mb-10">
            {FEATURES.map((f) => (
              <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-white/[0.09] text-slate-400 bg-white/[0.03]">
                <span className="text-orange-500 text-[8px]">✦</span>
                {f}
              </span>
            ))}
          </div>

          {/* Powered by */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-600 mb-3">
              Powered by
            </p>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <div key={p.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                  <span className="text-[12px] font-bold text-slate-200">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[12px] text-slate-700">© 2026 Edro.Digital</p>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex items-center justify-center w-full lg:w-[460px] shrink-0 px-6 py-12 bg-[#060b17] lg:border-l border-white/[0.06]">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img src="/brand/logo-studio.png" alt="edro.studio" className="h-6 w-auto" />
          </div>

          <h2 className="text-white text-xl font-bold mb-1">
            {step === 'verify' ? 'Verificar código' : 'Acessar plataforma'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {step === 'verify'
              ? 'Insira o código enviado para seu email.'
              : 'Digite seu email corporativo para continuar.'}
          </p>

          {error && <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2, fontSize: 13 }}>{message}</Alert>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <TextField
              label="Email"
              placeholder="name@edro.digital"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                  '&.Mui-focused fieldset': { borderColor: '#E85219' },
                },
                '& .MuiInputLabel-root': { color: '#64748b' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#E85219' },
              }}
            />

            {step === 'verify' && (
              <TextField
                label="Código"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                fullWidth
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.04)',
                    color: '#e2e8f0',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                    '&.Mui-focused fieldset': { borderColor: '#E85219' },
                  },
                  '& .MuiInputLabel-root': { color: '#64748b' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#E85219' },
                }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
              sx={{
                mt: 0.5,
                bgcolor: '#E85219',
                fontWeight: 700,
                py: 1.25,
                '&:hover': { bgcolor: '#e55c00' },
                '&:disabled': { bgcolor: 'rgba(232,82,25,0.4)' },
              }}
            >
              {loading
                ? <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                : step === 'verify' ? 'Entrar' : 'Enviar código'}
            </Button>

            {step === 'verify' && (
              <Button
                type="button"
                variant="text"
                onClick={handleRequest}
                disabled={loading}
                sx={{ color: '#64748b', fontSize: 13, '&:hover': { color: '#94a3b8' } }}
              >
                Reenviar código
              </Button>
            )}
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[11px] text-slate-600 uppercase tracking-wider">ou</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          <Button
            variant="outlined"
            href={ssoUrl}
            fullWidth
            sx={{
              borderColor: 'rgba(255,255,255,0.12)',
              color: '#94a3b8',
              fontWeight: 600,
              '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            Entrar com SSO
          </Button>
        </div>
      </div>
    </div>
  );
}
