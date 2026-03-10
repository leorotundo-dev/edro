'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Link from 'next/link';
import clsx from 'clsx';

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
  review: 'Em revisao',
  done: 'Concluido',
};

function statusTone(status: string) {
  if (status === 'done') return 'portal-pill-success';
  if (status === 'review') return 'portal-pill-warning';
  if (status === 'in_progress') return 'portal-pill-accent';
  return 'portal-pill-neutral';
}

export default function JobsPage() {
  const { data, isLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs', swrFetcher);
  const jobs = data?.jobs ?? [];

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Projetos</span>
        <h2 className="portal-page-title">Visao completa dos jobs</h2>
        <p className="portal-page-subtitle">Todos os itens disponibilizados para sua conta, com status de producao e aprovacao.</p>
      </div>

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando projetos</p><p className="portal-card-subtitle">Buscando o status mais recente.</p></div></div>
        ) : jobs.length === 0 ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhum projeto encontrado</p><p className="portal-card-subtitle">Assim que houver jobs vinculados, eles aparecem aqui.</p></div></div>
        ) : (
          <div className="portal-list">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{job.title}</p>
                    <p className="portal-card-subtitle">Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="portal-inline-stack">
                    <span className={clsx('portal-pill', statusTone(job.status))}>{STATUS_LABEL[job.status] ?? job.status}</span>
                    {job.copy_approved_at && <span className="portal-pill portal-pill-success">Copy aprovada</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
