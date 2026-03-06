'use client';

import { useState } from 'react';
import { setToken, apiPost } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [token, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiPost('/auth/magic-link', { email, role: 'client' });
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao enviar link');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost<{ token: string }>('/auth/magic-link/verify', { email, code: token, role: 'client' });
      setToken(data.token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message ?? 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-800">Portal do Cliente</h1>
          <p className="text-sm text-slate-500 mt-1">Edro Digital</p>
        </div>

        {!sent ? (
          <form onSubmit={handleRequestLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              Verifique seu e-mail e cole o código de acesso abaixo.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Cole o código aqui"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="w-full text-slate-400 text-xs hover:text-slate-600"
            >
              Reenviar link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
