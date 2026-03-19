'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

type Payable = {
  id: string;
  period_month: string;
  total_minutes: number | null;
  flat_fee_brl: string | null;
  amount_brl: string;
  status: 'open' | 'paid';
  paid_at: string | null;
};

function fmtM(m: number | null) {
  if (!m) return null;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

export default function PagamentosPage() {
  const { data, isLoading } = useSWR<{ payables: Payable[] }>('/freelancers/portal/me/payables', swrFetcher);
  const payables = data?.payables ?? [];

  const totalPaid = payables
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + parseFloat(p.amount_brl), 0);
  const openPayable = payables.find(p => p.status === 'open');

  const handleDownload = async (payable: Payable) => {
    const token = localStorage.getItem('fl_token') ?? '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const res = await fetch(`${apiUrl}/api/freelancers/payables/${payable.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Erro ao baixar PDF'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `recibo-${payable.period_month}.pdf`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Financeiro</span>
        <h2 className="portal-page-title">◎ Pagamentos</h2>
        <p className="portal-page-subtitle">
          Histórico de valores gerados, com recibo em PDF quando disponível.
        </p>
      </div>

      {/* Stats */}
      {!isLoading && payables.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {openPayable && (
            <div style={{
              flex: '1 1 160px',
              background: 'linear-gradient(135deg, rgba(19,222,185,0.15) 0%, rgba(93,135,255,0.10) 100%)',
              border: '2px solid rgba(19,222,185,0.35)', borderRadius: 16, padding: '20px 18px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#13DEB9' }}>
                R$ {parseFloat(openPayable.amount_brl).toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4, fontWeight: 600 }}>
                A receber — {openPayable.period_month}
              </div>
              {fmtM(openPayable.total_minutes) && (
                <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 2 }}>
                  ⏱ {fmtM(openPayable.total_minutes)}
                </div>
              )}
            </div>
          )}

          {totalPaid > 0 && (
            <div style={{
              flex: '1 1 160px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--portal-border)', borderRadius: 16, padding: '20px 18px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏦</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--portal-text)' }}>
                R$ {totalPaid.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>
                Total histórico recebido
              </div>
            </div>
          )}

          <div style={{
            flex: '1 1 120px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--portal-border)', borderRadius: 16, padding: '20px 18px',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--portal-text)' }}>
              {payables.length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Fechamentos</div>
          </div>
        </div>
      )}

      {/* List */}
      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando pagamentos...</p>
          </div>
        ) : !payables.length ? (
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
            <p className="portal-card-title">Nenhum pagamento ainda</p>
            <p className="portal-card-subtitle">Assim que houver fechamento, o valor aparece aqui.</p>
          </div>
        ) : (
          <div className="portal-list">
            {payables.map((p) => {
              const isPaid = p.status === 'paid';
              const amount = parseFloat(p.amount_brl);
              return (
                <div key={p.id} className="portal-list-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Status icon */}
                    <span style={{ fontSize: 28, flexShrink: 0 }}>
                      {isPaid ? '✅' : '⏳'}
                    </span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="portal-card-title" style={{ marginBottom: 2 }}>
                        {p.period_month}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: isPaid ? 'rgba(19,222,185,0.15)' : 'rgba(248,168,0,0.12)',
                          color: isPaid ? '#13DEB9' : '#F8A800',
                        }}>
                          {isPaid ? '✅ Pago' : '⏳ A pagar'}
                        </span>
                        {fmtM(p.total_minutes) && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'var(--portal-muted)',
                          }}>
                            ⏱ {fmtM(p.total_minutes)}
                          </span>
                        )}
                        {p.flat_fee_brl && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'var(--portal-muted)',
                          }}>
                            Flat fee
                          </span>
                        )}
                        {isPaid && p.paid_at && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.06)', color: 'var(--portal-muted)',
                          }}>
                            Pago em {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount + download */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 18, fontWeight: 800,
                        color: isPaid ? '#13DEB9' : 'var(--portal-accent)',
                        marginBottom: 6,
                      }}>
                        R$ {amount.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(p)}
                        style={{
                          background: 'rgba(255,255,255,0.08)', border: '1px solid var(--portal-border)',
                          color: 'var(--portal-text)', borderRadius: 8, padding: '5px 12px',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        }}
                      >
                        📥 PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
