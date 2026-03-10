'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Link from 'next/link';

type Job = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  copy_approved_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
};

function statusColor(status: string) {
  if (status === 'done') return 'bg-green-100 text-green-700';
  if (status === 'review') return 'bg-yellow-100 text-yellow-700';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
}

export default function JobsPage() {
  const { data, isLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);
  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Projetos</h1>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhum projeto encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{j.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atualizado em {new Date(j.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(j.status)}`}>
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                  {j.copy_approved_at && (
                    <span className="text-xs text-green-600">Copy aprovada ✓</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
