'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

type ContractStatus = 'none' | 'pending_signature' | 'signed' | 'cancelled';

interface ContractState {
  status: ContractStatus;
  signed_at: string | null;
  pdf_url: string | null;
  sent_at: string | null;
}

export default function TermosPage() {
  const router = useRouter();
  const [contract, setContract] = useState<ContractState | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadContract = useCallback(async () => {
    try {
      const data = await apiGet<ContractState>('/freelancers/portal/me/contract');
      setContract(data);
      if (data.status === 'signed') {
        router.replace('/');
      }
    } catch {
      // ignore — might not have contract yet
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadContract();
    // Poll every 15s so the page auto-advances when the user signs in D4Sign tab
    const t = setInterval(loadContract, 15_000);
    return () => clearInterval(t);
  }, [loadContract]);

  const sendContract = async () => {
    setSending(true);
    setError('');
    try {
      await apiPost('/freelancers/portal/me/contract/send', {});
      await loadContract();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao enviar contrato. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const resend = async () => {
    setSending(true);
    setError('');
    try {
      await apiPost('/freelancers/portal/me/contract/send', {});
      setError('');
      await loadContract();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao reenviar.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Verificando contrato...</div>
      </div>
    );
  }

  const status = contract?.status ?? 'none';

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5D87FF', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Etapa final
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Assinatura do Contrato
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Assine digitalmente o contrato de prestação de serviços PJ para liberar seu acesso ao portal.
          </p>
        </div>

        {/* State: none — first time */}
        {status === 'none' && (
          <div style={cardStyle}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>📄</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 1.6 }}>
              Seu contrato de prestação de serviços será gerado com os dados do seu cadastro e enviado para o seu e-mail via <strong style={{ color: '#fff' }}>D4Sign</strong>.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.6 }}>
              O processo é 100% digital e tem validade jurídica conforme a Lei 14.063/2020.
            </p>

            <div style={infoBoxStyle}>
              <strong>O que acontece a seguir:</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 2 }}>
                <li>Clique em "Enviar contrato para assinar"</li>
                <li>Verifique seu e-mail — você receberá um link do D4Sign</li>
                <li>Assine digitalmente (sem certificado ICP — assine online mesmo)</li>
                <li>Pronto! Seu acesso ao portal é liberado automaticamente</li>
              </ol>
            </div>

            {error && <div style={errorStyle}>{error}</div>}

            <button
              type="button"
              onClick={sendContract}
              disabled={sending}
              style={{ ...btnStyle, marginTop: 24, opacity: sending ? 0.6 : 1 }}
            >
              {sending ? 'Gerando e enviando...' : 'Enviar contrato para assinar →'}
            </button>
          </div>
        )}

        {/* State: pending_signature */}
        {status === 'pending_signature' && (
          <div style={cardStyle}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>✉️</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 10px', textAlign: 'center' }}>
              Contrato enviado!
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
              Verifique seu e-mail. Você receberá um link do <strong style={{ color: '#fff' }}>D4Sign</strong> para assinar o contrato online.
              <br />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Esta página atualiza automaticamente após a assinatura.
              </span>
            </p>

            <div style={{ ...infoBoxStyle, borderColor: 'rgba(19,222,185,0.3)', background: 'rgba(19,222,185,0.05)' }}>
              <span style={{ color: '#13DEB9', fontWeight: 700 }}>Dica:</span> Abra o e-mail em outra aba, assine, e esta página avançará automaticamente.
            </div>

            {contract?.sent_at && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 16 }}>
                Enviado em {new Date(contract.sent_at).toLocaleString('pt-BR')}
              </p>
            )}

            {error && <div style={errorStyle}>{error}</div>}

            <button
              type="button"
              onClick={resend}
              disabled={sending}
              style={{ ...btnStyle, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', marginTop: 20, fontSize: 13, opacity: sending ? 0.5 : 1 }}
            >
              {sending ? 'Reenviando...' : 'Não recebi o e-mail — reenviar'}
            </button>
          </div>
        )}

        {/* State: cancelled */}
        {status === 'cancelled' && (
          <div style={cardStyle}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>⚠️</div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FA896B', margin: '0 0 12px', textAlign: 'center' }}>
              Contrato cancelado
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24 }}>
              O contrato anterior foi cancelado. Gere um novo para continuar.
            </p>
            {error && <div style={errorStyle}>{error}</div>}
            <button type="button" onClick={sendContract} disabled={sending} style={{ ...btnStyle, opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Gerando...' : 'Gerar novo contrato'}
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20 }}>
          Assinatura digital com validade jurídica — Lei 14.063/2020 — via D4Sign
        </p>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0d0d0d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: '32px 28px',
};

const infoBoxStyle: React.CSSProperties = {
  background: 'rgba(93,135,255,0.08)',
  border: '1px solid rgba(93,135,255,0.2)',
  borderRadius: 10,
  padding: '14px 16px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.6)',
  lineHeight: 1.6,
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 24px',
  borderRadius: 10,
  border: 'none',
  background: '#5D87FF',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(250,137,107,0.12)',
  border: '1px solid rgba(250,137,107,0.3)',
  color: '#FA896B',
  fontSize: 13,
};
