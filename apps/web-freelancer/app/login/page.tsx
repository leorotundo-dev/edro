'use client';

import { useState } from 'react';
import { setToken } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [code, setCode]         = useState('');
  const [step, setStep]         = useState<'email' | 'code'>('email');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL ?? '';

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep('code');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.token) throw new Error('Token não retornado');
      setToken(data.token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message ?? 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Portal Freelancer</h1>
        <p className="text-sm text-slate-500 mb-6">Edro Digital</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-sm text-slate-500">Código enviado para <strong>{email}</strong></p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                maxLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <button
              type="button"
              className="w-full text-slate-500 text-sm hover:underline"
              onClick={() => setStep('email')}
            >
              Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
