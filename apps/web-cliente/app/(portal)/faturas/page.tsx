'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import clsx from 'clsx';

type Invoice = {
  id: string;
  description: string;
  amount_brl: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  paid_at: string | null;
  period_month: string | null;
  pdf_url: string | null;
};

function formatCurrency(value: string) {
  return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusMeta(status: Invoice['status']) {
  if (status === 'paid') return { tone: 'portal-pill-success', label: 'Paga' };
  if (status === 'sent') return { tone: 'portal-pill-accent', label: 'Enviada' };
  if (status === 'overdue') return { tone: 'portal-pill-danger', label: 'Vencida' };
  if (status === 'cancelled') return { tone: 'portal-pill-neutral', label: 'Cancelada' };
  return { tone: 'portal-pill-neutral', label: 'Rascunho' };
}

export default function FaturasPage() {
  const { data, isLoading } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices', swrFetcher);
  const invoices = data?.invoices ?? [];

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Financeiro</span>
        <h2 className="portal-page-title">Faturas</h2>
        <p className="portal-page-subtitle">Historico financeiro da conta com acesso rapido ao PDF sempre que estiver disponivel.</p>
      </div>

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando faturas</p><p className="portal-card-subtitle">Buscando o historico financeiro.</p></div></div>
        ) : invoices.length === 0 ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhuma fatura emitida</p><p className="portal-card-subtitle">Quando houver emissao, o documento aparecera aqui.</p></div></div>
        ) : (
          <div className="portal-list">
            {invoices.map((invoice) => {
              const chip = statusMeta(invoice.status);
              return (
                <div key={invoice.id} className="portal-list-card">
                  <div className="portal-list-row">
                    <div>
                      <p className="portal-card-title">{invoice.description}</p>
                      {invoice.period_month && <p className="portal-card-subtitle">Periodo: {invoice.period_month}</p>}
                      {invoice.due_date && invoice.status !== 'paid' && (
                        <p className="portal-card-subtitle">Vence em {new Date(invoice.due_date).toLocaleDateString('pt-BR')}</p>
                      )}
                      {invoice.paid_at && <p className="portal-card-subtitle">Pago em {new Date(invoice.paid_at).toLocaleDateString('pt-BR')}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p className="portal-card-title">{formatCurrency(invoice.amount_brl)}</p>
                      <div className="portal-inline-stack" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                        <span className={clsx('portal-pill', chip.tone)}>{chip.label}</span>
                        {invoice.pdf_url && (
                          <a href={invoice.pdf_url} target="_blank" rel="noreferrer" className="portal-section-link">
                            Abrir PDF
                          </a>
                        )}
                      </div>
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
