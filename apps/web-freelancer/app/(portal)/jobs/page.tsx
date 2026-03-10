'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

type Job = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  briefing:    'Briefing',
  iclips_in:   'iClips Entrada',
  alinhamento: 'Alinhamento',
  copy_ia:     'Copy IA',
  aprovacao:   'Aprovação',
  producao:    'Produção',
  revisao:     'Revisão',
  iclips_out:  'iClips Saída',
  done:        'Concluído',
};

export default function JobsPage() {
  // The portal /me endpoint doesn't return briefings — we'd need a dedicated endpoint.
  // For now, show a helpful message until backend has GET /freelancers/portal/me/jobs.
  const { data, isLoading } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);

  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Jobs</h1>

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : !jobs.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhum job atribuído a você.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{job.title}</p>
                  {job.client_name && (
                    <p className="text-xs text-slate-500 mt-0.5">{job.client_name}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
              </div>
              {job.due_at && (
                <p className="text-xs text-slate-400 mt-2">
                  Entrega: {new Date(job.due_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
