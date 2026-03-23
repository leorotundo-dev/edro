'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { getApiBase, getBackendBase } from '@/lib/api';

type LoginStep = 'request' | 'verify' | 'mfa' | 'mfaSetup' | 'mfaRecovery';

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
  const [step, setStep] = useState<LoginStep>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const backendBase = getBackendBase();
  const ssoBase = backendBase || getApiBase();
  const ssoUrl = backendBase ? `${ssoBase}/api/auth/sso/start` : `${ssoBase}/auth/sso/start`;

  async function bootstrapPendingMfa() {
    const pendingRes = await fetch('/api/auth/mfa/pending', { cache: 'no-store' });
    if (!pendingRes.ok) return false;

    const pendingData = await pendingRes.json();
    if (pendingData?.email) {
      setEmail(pendingData.email);
    }

    if (pendingData?.purpose === 'mfa_setup') {
      const enrollRes = await fetch('/api/auth/mfa/enroll/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const text = await enrollRes.text();
      const enrollData = text ? JSON.parse(text) : {};
      if (!enrollRes.ok) {
        throw new Error(enrollData?.error || 'Não foi possível iniciar o MFA.');
      }
      setMfaSecret(enrollData?.secret || '');
      setMessage('Configure o app autenticador e valide o primeiro código.');
      setStep('mfaSetup');
      return true;
    }

    setMessage('Confirme o login com o código do seu autenticador ou com um recovery code.');
    setStep('mfa');
    return true;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const bootstrapSession = async () => {
      const nextPath = resolveNextPath();
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!sessionRes.ok) return;

      try {
        const data = await sessionRes.json();
        if (cancelled) return;
        if (data?.user?.email) {
          localStorage.setItem('edro_user', JSON.stringify(data.user));
        }
        router.replace(nextPath);
      } catch {
        if (cancelled) return;
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
      const response = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data?.error || data?.message || text || 'Falha ao solicitar código.');
      }
      if (data?.code) {
        setMessage(`Código gerado: ${data.code}`);
      } else {
        setMessage('Código enviado. Verifique seu email.');
      }
      setStep('verify');
    } catch (err: any) {
      setError(err?.message || 'Falha ao solicitar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data?.error || data?.message || text || 'Falha ao validar código.');
      }
      if (data?.user) localStorage.setItem('edro_user', JSON.stringify(data.user));
      router.replace(resolveNextPath());
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data?.error || data?.message || text || 'Falha ao validar MFA.');
      }
      if (data?.user) localStorage.setItem('edro_user', JSON.stringify(data.user));
      router.replace(resolveNextPath());
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar MFA.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaEnrollConfirm = async () => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const response = await fetch('/api/auth/mfa/enroll/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mfaCode }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data?.error || data?.message || text || 'Falha ao ativar MFA.');
      }
      if (data?.user) localStorage.setItem('edro_user', JSON.stringify(data.user));
      setRecoveryCodes(Array.isArray(data?.recoveryCodes) ? data.recoveryCodes : []);
      setMessage('MFA ativado. Guarde os recovery codes em local seguro antes de continuar.');
      setStep('mfaRecovery');
    } catch (err: any) {
      setError(err?.message || 'Falha ao ativar MFA.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterRecovery = () => {
    router.replace(resolveNextPath());
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (step === 'request') await handleRequest();
    else if (step === 'verify') await handleVerify();
    else if (step === 'mfa') await handleMfaVerify();
    else if (step === 'mfaSetup') await handleMfaEnrollConfirm();
  };

  const titleByStep: Record<LoginStep, string> = {
    request: 'Acessar plataforma',
    verify: 'Verificar código',
    mfa: 'Confirmar MFA',
    mfaSetup: 'Ativar MFA',
    mfaRecovery: 'Recovery Codes',
  };

  const subtitleByStep: Record<LoginStep, string> = {
    request: 'Digite seu email corporativo para continuar.',
    verify: 'Insira o código enviado para seu email.',
    mfa: 'Use o código do app autenticador ou um recovery code.',
    mfaSetup: 'Cadastre a chave abaixo no app autenticador e valide o primeiro código.',
    mfaRecovery: 'Salve estes códigos. Eles serão exibidos apenas uma vez.',
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      <div className="hidden lg:flex flex-col justify-between flex-1 px-16 py-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(232,82,25,0.10)_0%,transparent_70%)] pointer-events-none" />

        <div>
          <img src="/brand/logo-studio.png" alt="edro.studio" className="h-7 w-auto" />
        </div>

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

          <div className="flex flex-wrap gap-2 mb-10">
            {FEATURES.map((f) => (
              <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-white/[0.09] text-slate-400 bg-white/[0.03]">
                <span className="text-orange-500 text-[8px]">✦</span>
                {f}
              </span>
            ))}
          </div>

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

        <p className="text-[12px] text-slate-700">© 2026 Edro.Digital</p>
      </div>

      <div className="flex items-center justify-center w-full lg:w-[460px] shrink-0 px-6 py-12 bg-[#060b17] lg:border-l border-white/[0.06]">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8">
            <img src="/brand/logo-studio.png" alt="edro.studio" className="h-6 w-auto" />
          </div>

          <h2 className="text-white text-xl font-bold mb-1">{titleByStep[step]}</h2>
          <p className="text-slate-400 text-sm mb-6">{subtitleByStep[step]}</p>

          {error && <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2, fontSize: 13 }}>{message}</Alert>}

          {step === 'mfaRecovery' ? (
            <div className="flex flex-col gap-4">
              <Alert severity="warning" sx={{ fontSize: 13 }}>
                Estes códigos substituem o autenticador se você perder o dispositivo. Guarde fora do navegador.
              </Alert>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((item) => (
                    <code key={item} className="rounded bg-black/30 px-3 py-2 text-[12px] text-slate-200">
                      {item}
                    </code>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="contained"
                onClick={handleContinueAfterRecovery}
                sx={{
                  bgcolor: '#E85219',
                  fontWeight: 700,
                  py: 1.25,
                  '&:hover': { bgcolor: '#e55c00' },
                }}
              >
                Continuar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {(step === 'request' || step === 'verify') && (
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
              )}

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

              {(step === 'mfa' || step === 'mfaSetup') && (
                <>
                  <TextField
                    label="Conta"
                    value={email}
                    disabled
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#94a3b8',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                      },
                      '& .MuiInputLabel-root': { color: '#64748b' },
                    }}
                  />
                  {step === 'mfaSetup' && (
                    <TextField
                      label="Chave manual"
                      value={mfaSecret}
                      fullWidth
                      size="small"
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.04)',
                          color: '#e2e8f0',
                          '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        },
                        '& .MuiInputLabel-root': { color: '#64748b' },
                      }}
                    />
                  )}
                  <TextField
                    label={step === 'mfaSetup' ? 'Primeiro código do autenticador' : 'Código MFA ou recovery code'}
                    placeholder={step === 'mfaSetup' ? '000000' : '000000 ou ABCDE-12345'}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
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
                </>
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
                  : step === 'verify'
                    ? 'Entrar'
                    : step === 'mfa'
                      ? 'Validar MFA'
                      : step === 'mfaSetup'
                        ? 'Ativar MFA'
                        : 'Enviar código'}
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
          )}

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
