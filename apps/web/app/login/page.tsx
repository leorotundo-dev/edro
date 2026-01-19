'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
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

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      setLoading(true);
      const response = await apiPost('/auth/verify', { email, code });
      if (!response?.token) {
        throw new Error('Token nao retornado.');
      }
      localStorage.setItem('edro_token', response.token);
      if (response?.user) {
        localStorage.setItem('edro_user', JSON.stringify(response.user));
      }
      router.replace('/board');
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar codigo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-card">
        <div className="login-header">
          <span className="brand-pill">Edro Digital</span>
          <h1>Acesso interno</h1>
          <p>Somente emails @edro.digital podem entrar.</p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="login-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="voce@edro.digital"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar codigo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="login-form">
            <label className="field">
              <span>Codigo</span>
              <input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
            </label>
            <div className="login-actions">
              <button className="btn ghost" type="button" onClick={() => setStep('request')}>
                Trocar email
              </button>
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? 'Validando...' : 'Entrar'}
              </button>
            </div>
          </form>
        )}

        {message ? <div className="notice success">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
        </div>
        <aside className="login-aside">
          <div className="login-aside-card highlight">
            <h2>Central de operacao</h2>
            <p>Briefing, copy, aprovacao e entrega em um quadro vivo.</p>
            <div className="login-aside-tags">
              <span>Briefing</span>
              <span>Copy IA</span>
              <span>Producao</span>
              <span>Entrega</span>
            </div>
          </div>
          <div className="login-aside-card">
            <h3>Fluxo guiado</h3>
            <p>O proximo passo so libera quando o anterior estiver concluido.</p>
            <div className="login-aside-stats">
              <div>
                <strong>360</strong>
                <span>pecas/mes</span>
              </div>
              <div>
                <strong>12</strong>
                <span>clientes</span>
              </div>
              <div>
                <strong>10</strong>
                <span>pessoas</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
