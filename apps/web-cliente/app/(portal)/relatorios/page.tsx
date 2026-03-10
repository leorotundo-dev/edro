'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

type Report = {
  id: string;
  period_month: string;
  title: string;
  created_at: string;
  pdf_url: string | null;
};

export default function RelatoriosPage() {
  const { data, isLoading } = useSWR<{ reports: Report[] }>('/portal/client/reports', swrFetcher);
  const reports = data?.reports ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Relatórios</h1>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhum relatório gerado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800 text-sm">{r.title ?? `Relatório ${r.period_month}`}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(r.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {r.pdf_url && (
                <a
                  href={r.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 text-xs hover:underline shrink-0"
                >
                  Baixar PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
