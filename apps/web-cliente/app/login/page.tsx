'use client';

import { useState } from 'react';
import { setToken, apiPost } from '@/lib/api';

const FEATURES = [
  'Aprovacoes centralizadas',
  'Projetos em tempo real',
  'Relatorios e faturas',
  'Contexto direto com a agencia',
];

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
      setError(err.message ?? 'Token invalido ou expirado');
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
            <h1 className="portal-brand-title">Portal do Cliente</h1>
            <p className="portal-brand-subtitle">
              A mesma linguagem visual do Edro Web, agora aplicada ao acesso do cliente.
            </p>
          </div>
        </div>

        <div className="portal-login-display">
          <span className="portal-kicker">Workspace cliente</span>
          <h2 className="portal-login-title">
            Sua agencia, seus materiais e suas aprovacoes em um unico <em>painel</em>.
          </h2>
          <p className="portal-login-copy">
            Entre com seu email para acompanhar jobs, aprovar entregas, consultar relatorios e revisar faturamento sem depender de troca manual por WhatsApp ou email.
          </p>

          <div className="portal-login-features">
            {FEATURES.map((feature) => (
              <span key={feature} className="portal-login-pill">{feature}</span>
            ))}
          </div>
        </div>

        <p className="portal-brand-subtitle">Edro.Digital · operacao orientada por contexto</p>
      </section>

      <aside className="portal-login-side">
        <div className="portal-login-card">
          <span className="portal-kicker">Acesso seguro</span>
          <h2>{sent ? 'Validar codigo' : 'Entrar no portal'}</h2>
          <p>
            {sent
              ? 'Use o codigo enviado para seu email para concluir a autenticacao.'
              : 'Digite o email autorizado para receber o link de acesso.'}
          </p>

          {error && <div className="portal-alert portal-alert-error">{error}</div>}

          {!sent ? (
            <form onSubmit={handleRequestLink} className="portal-login-form">
              <div>
                <label className="portal-field-label" htmlFor="client-email">Email</label>
                <input
                  id="client-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  className="portal-input"
                />
              </div>

              <button type="submit" disabled={loading} className="portal-button">
                {loading ? 'Enviando acesso...' : 'Enviar link de acesso'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="portal-login-form">
              <div className="portal-note">
                Verifique o email <strong style={{ color: '#fff' }}>{email}</strong> e cole o codigo abaixo.
              </div>

              <div>
                <label className="portal-field-label" htmlFor="client-code">Codigo</label>
                <input
                  id="client-code"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Cole o codigo aqui"
                  className="portal-input"
                />
              </div>

              <button type="submit" disabled={loading} className="portal-button">
                {loading ? 'Validando...' : 'Entrar'}
              </button>
              <button type="button" onClick={() => setSent(false)} className="portal-button-ghost">
                Reenviar link
              </button>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
