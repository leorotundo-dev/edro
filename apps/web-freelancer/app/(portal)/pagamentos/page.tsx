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

export default function PagamentosPage() {
  const { data, isLoading } = useSWR<{ payables: Payable[] }>(
    '/freelancers/portal/me/payables',
    swrFetcher,
  );

  const payables = data?.payables ?? [];

  function fmtMins(mins: number | null) {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  const handleDownload = async (p: Payable) => {
    const token = localStorage.getItem('fl_token') ?? '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const res = await fetch(`${apiUrl}/api/freelancers/payables/${p.id}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Erro ao baixar PDF'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${p.period_month}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Pagamentos</h1>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : !payables.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhum pagamento gerado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payables.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-800 text-sm">{p.period_month}</p>
                <p className="text-xs text-slate-500 mt-0.5">Horas: {fmtMins(p.total_minutes)}</p>
                {p.paid_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Pago em {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">
                    R$ {parseFloat(p.amount_brl).toFixed(2)}
                  </p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {p.status === 'paid' ? 'Pago' : 'A pagar'}
                  </span>
                </div>
                <button
                  onClick={() => handleDownload(p)}
                  className="text-slate-400 hover:text-blue-600 text-xs"
                  title="Baixar recibo PDF"
                >
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
