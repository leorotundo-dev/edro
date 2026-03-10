'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import clsx from 'clsx';

type Payable = {
  id: string;
  period_month: string;
  total_minutes: number | null;
  flat_fee_brl: string | null;
  amount_brl: string;
  status: 'open' | 'paid';
  paid_at: string | null;
};

export default function PagamentosPage() {
  const { data, isLoading } = useSWR<{ payables: Payable[] }>('/freelancers/portal/me/payables', swrFetcher);
  const payables = data?.payables ?? [];

  function formatMinutes(minutes: number | null) {
    if (!minutes) return 'Sem apontamento';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  }

  const handleDownload = async (payable: Payable) => {
    const token = localStorage.getItem('fl_token') ?? '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const response = await fetch(`${apiUrl}/api/freelancers/payables/${payable.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      alert('Erro ao baixar PDF');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `recibo-${payable.period_month}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Financeiro</span>
        <h2 className="portal-page-title">Pagamentos</h2>
        <p className="portal-page-subtitle">Historico de valores gerados para pagamento, com comprovante em PDF quando disponivel.</p>
      </div>

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando pagamentos</p><p className="portal-card-subtitle">Buscando os valores vinculados a sua conta.</p></div></div>
        ) : !payables.length ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhum pagamento gerado</p><p className="portal-card-subtitle">Assim que houver fechamento, o valor sera listado aqui.</p></div></div>
        ) : (
          <div className="portal-list">
            {payables.map((payable) => (
              <div key={payable.id} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{payable.period_month}</p>
                    <p className="portal-card-subtitle">Horas contabilizadas: {formatMinutes(payable.total_minutes)}</p>
                    {payable.paid_at && <p className="portal-card-subtitle">Pago em {new Date(payable.paid_at).toLocaleDateString('pt-BR')}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="portal-card-title">R$ {parseFloat(payable.amount_brl).toFixed(2)}</p>
                    <div className="portal-inline-stack" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                      <span className={clsx('portal-pill', payable.status === 'paid' ? 'portal-pill-success' : 'portal-pill-warning')}>
                        {payable.status === 'paid' ? 'Pago' : 'A pagar'}
                      </span>
                      <button onClick={() => handleDownload(payable)} className="portal-button-secondary">
                        Baixar PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
