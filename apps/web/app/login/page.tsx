'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, getApiBase, getBackendBase } from '@/lib/api';

const PAGE_THEME = {
  '--edro-primary': '#FF5C00',
  '--edro-bg-light': '#F8F9FA',
  '--edro-bg-dark': '#0A0A0A',
  '--edro-card-light': '#FFFFFF',
  '--edro-card-dark': '#141414',
  '--edro-border-light': '#E5E7EB',
  '--edro-border-dark': '#262626',
} as React.CSSProperties;

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
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.add('dark');
    return () => {
      if (!wasDark) html.classList.remove('dark');
    };
  }, []);

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
    <div
      className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen selection:bg-primary selection:text-white"
      style={{ ...PAGE_THEME, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-transparent backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
            <span className="text-white font-black text-xl italic">e</span>
          </div>
          <span className="font-bold text-xl tracking-tighter dark:text-white">edro</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium uppercase tracking-widest opacity-80">
          <span className="hover:text-primary transition-colors">Our Way</span>
          <span className="hover:text-primary transition-colors">Our Work</span>
        </div>
        <button
          className="bg-primary text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
          type="button"
        >
          Get in Touch
        </button>
      </nav>

      <main className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-20">
        <div className="absolute inset-0 flex items-center justify-center z-0 overflow-hidden">
          <span className="text-[35vw] leading-[0.8] tracking-[-0.05em] opacity-[0.05] pointer-events-none select-none font-black italic dark:text-primary text-slate-300">
            edro
          </span>
        </div>
        <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-6xl md:text-8xl font-light leading-[0.9] dark:text-white tracking-[-0.02em]">
                inspire,
                <br />
                create <span className="text-primary italic font-medium">&amp;</span>
                <br />
                elevate
              </h1>
            </div>
            <p className="text-lg md:text-xl font-light opacity-60 max-w-md border-l-2 border-primary pl-6 py-2">
              Internal studio operations platform designed for high-performance creative teams.
            </p>
            <div className="flex gap-4 pt-8 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500">
              <div className="text-xs font-bold uppercase tracking-widest">SaaS Edition 2.0</div>
              <div className="text-xs font-bold uppercase tracking-widest">Global Ops</div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md p-8 md:p-12 bg-white/5 dark:bg-[#141414]/80 backdrop-blur-xl border border-slate-200/20 dark:border-white/10 shadow-2xl">
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-2xl font-bold mb-2">Access Portal</h2>
                <p className="text-sm opacity-50">
                  {step === 'verify'
                    ? 'Insira o codigo para entrar.'
                    : 'Digite seu email corporativo para receber o codigo.'}
                </p>
              </div>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Corporate Email</label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-slate-300 dark:border-white/20 focus:ring-0 focus:border-primary py-3 px-0 transition-colors placeholder:text-slate-400 dark:placeholder:text-white/20"
                    placeholder="name@edro.digital"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Access Code</label>
                    <button
                      className="text-[10px] uppercase tracking-widest font-bold text-primary hover:underline"
                      type="button"
                      onClick={handleRequest}
                      disabled={loading}
                    >
                      Reenviar
                    </button>
                  </div>
                  <input
                    className="w-full bg-transparent border-0 border-b border-slate-300 dark:border-white/20 focus:ring-0 focus:border-primary py-3 px-0 transition-colors placeholder:text-slate-400 dark:placeholder:text-white/20"
                    placeholder="000000"
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required={step === 'verify'}
                  />
                </div>
                <div className="pt-4">
                  <button
                    className="w-full bg-primary text-white py-4 font-bold uppercase tracking-[0.2em] text-sm hover:shadow-[0_0_20px_rgba(255,92,0,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? 'Validando...'
                      : step === 'verify'
                        ? 'Enter Workspace'
                        : 'Enviar Codigo'}
                  </button>
                </div>
              </form>

              {message ? <div className="mt-4 text-xs text-green-400">{message}</div> : null}
              {error ? <div className="mt-4 text-xs text-rose-400">{error}</div> : null}

              <div className="mt-8 pt-8 border-t border-slate-200/10 flex flex-col items-center gap-4">
                <span className="text-[10px] uppercase tracking-widest opacity-30">Or sign in with SSO</span>
                <div className="flex gap-4">
                  <a
                    className="w-12 h-12 flex items-center justify-center border border-slate-200/20 hover:border-primary transition-colors"
                    href={ssoUrl}
                  >
                    <span className="material-symbols-outlined">lock_open</span>
                  </a>
                  <button
                    className="w-12 h-12 flex items-center justify-center border border-slate-200/20 hover:border-primary transition-colors"
                    type="button"
                    onClick={() => setStep(step === 'verify' ? 'request' : 'verify')}
                  >
                    <span className="material-symbols-outlined">passkey</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-12 bg-transparent overflow-hidden">
        <div className="container mx-auto px-8 mb-8 flex justify-between items-end border-b border-slate-200/10 pb-4">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-30">Trusted by Global Teams</span>
          <div className="flex gap-4">
            <span className="opacity-40 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-sm">hub</span>
            </span>
            <span className="opacity-40 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-sm">alternate_email</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
