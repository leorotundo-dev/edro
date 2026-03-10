'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Link from 'next/link';

type Job = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

export default function AprovacoesPage() {
  const { data, isLoading } = useSWR<{ jobs: Job[] }>(
    '/portal/client/jobs?status=review',
    swrFetcher,
  );
  const jobs = (data?.jobs ?? []).filter((j) => j.status === 'review');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Aprovações pendentes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Projetos aguardando sua aprovação de copy.</p>
      </div>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhuma aprovação pendente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="block bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:border-yellow-400 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{j.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atualizado em {new Date(j.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
                  Aguarda aprovação
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
