'use client';

import { useState } from 'react';
import { getApiBaseUrl, setToken } from '@/lib/api';

const FEATURES = [
  'Jobs atribuidos com contexto',
  'Horas registradas por periodo',
  'Pagamentos e comprovantes',
  'Fluxo alinhado ao Edro Studio',
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API = getApiBaseUrl();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'staff' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep('code');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao enviar codigo');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/magic-link/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, role: 'staff' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.token) throw new Error('Token nao retornado');
      setToken(data.token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message ?? 'Codigo invalido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login">
      <section className="portal-login-hero">
        <div className="portal-brand-lockup">
          <div className="portal-brand-mark" aria-hidden="true" />
          <div className="portal-brand-copy">
            <span className="portal-brand-label">Edro Studio</span>
            <h1 className="portal-brand-title">Portal Freelancer</h1>
            <p className="portal-brand-subtitle">
              O painel freelancer agora compartilha o mesmo sistema visual do Edro Web.
            </p>
          </div>
        </div>

        <div className="portal-login-display">
          <span className="portal-kicker">Workspace freelancer</span>
          <h2 className="portal-login-title">
            Contexto de execucao, horas e pagamentos num ambiente <em>unificado</em>.
          </h2>
          <p className="portal-login-copy">
            Entre com seu email para acompanhar jobs, registrar trabalho concluido e consultar pagamentos com a mesma linguagem visual da operacao principal.
          </p>

          <div className="portal-login-features">
            {FEATURES.map((feature) => (
              <span key={feature} className="portal-login-pill">{feature}</span>
            ))}
          </div>
        </div>

        <p className="portal-brand-subtitle">Edro.Digital · rede de execucao conectada</p>
      </section>

      <aside className="portal-login-side">
        <div className="portal-login-card">
          <span className="portal-kicker">Acesso seguro</span>
          <h2>{step === 'code' ? 'Validar codigo' : 'Entrar no portal'}</h2>
          <p>
            {step === 'code'
              ? 'Digite o codigo enviado para concluir o acesso.'
              : 'Informe seu email cadastrado para receber o codigo de acesso.'}
          </p>

          {error && <div className="portal-alert portal-alert-error">{error}</div>}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="portal-login-form">
              <div>
                <label className="portal-field-label" htmlFor="freelancer-email">Email</label>
                <input
                  id="freelancer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@edro.digital"
                  className="portal-input"
                />
              </div>

              <button type="submit" disabled={loading} className="portal-button">
                {loading ? 'Enviando codigo...' : 'Enviar codigo'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="portal-login-form">
              <div className="portal-note">
                Codigo enviado para <strong style={{ color: '#fff' }}>{email}</strong>.
              </div>

              <div>
                <label className="portal-field-label" htmlFor="freelancer-code">Codigo</label>
                <input
                  id="freelancer-code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="portal-input"
                  placeholder="000000"
                  maxLength={8}
                />
              </div>

              <button type="submit" disabled={loading} className="portal-button">
                {loading ? 'Validando...' : 'Entrar'}
              </button>
              <button type="button" className="portal-button-ghost" onClick={() => setStep('email')}>
                Usar outro email
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
