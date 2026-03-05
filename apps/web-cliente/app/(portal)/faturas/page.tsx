'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

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

function brl(val: string) {
  return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusChip(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    sent: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    draft: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-slate-100 text-slate-400 line-through',
  };
  const label: Record<string, string> = {
    paid: 'Paga', sent: 'Enviada', overdue: 'Vencida', draft: 'Rascunho', cancelled: 'Cancelada',
  };
  return { cls: map[status] ?? 'bg-slate-100 text-slate-600', label: label[status] ?? status };
}

export default function FaturasPage() {
  const { data, isLoading } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices', swrFetcher);
  const invoices = data?.invoices ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Faturas</h1>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhuma fatura emitida.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const chip = statusChip(inv.status);
            return (
              <div
                key={inv.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{inv.description}</p>
                  {inv.period_month && (
                    <p className="text-xs text-slate-400 mt-0.5">Período: {inv.period_month}</p>
                  )}
                  {inv.due_date && inv.status !== 'paid' && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vence em {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {inv.paid_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Paga em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="text-lg font-bold text-slate-800">{brl(inv.amount_brl)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chip.cls}`}>
                    {chip.label}
                  </span>
                  {inv.pdf_url && (
                    <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                      PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
