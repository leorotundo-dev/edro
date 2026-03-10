'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import clsx from 'clsx';

type Job = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovacao',
  producao: 'Producao',
  revisao: 'Revisao',
  iclips_out: 'iClips saida',
  done: 'Concluido',
};

function statusTone(status: string) {
  if (status === 'done') return 'portal-pill-success';
  if (status === 'aprovacao' || status === 'revisao') return 'portal-pill-warning';
  if (status === 'producao' || status === 'copy_ia') return 'portal-pill-accent';
  return 'portal-pill-neutral';
}

export default function JobsPage() {
  const { data, isLoading } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);
  const jobs = data?.jobs ?? [];

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Execucao</span>
        <h2 className="portal-page-title">Jobs atribuidos</h2>
        <p className="portal-page-subtitle">Itens em que voce esta alocado, com contexto de cliente, prazo e status de etapa.</p>
      </div>

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando jobs</p><p className="portal-card-subtitle">Sincronizando atribuicoes.</p></div></div>
        ) : !jobs.length ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhum job atribuido</p><p className="portal-card-subtitle">Quando o backend expor atribuicoes para sua conta, a lista aparece aqui.</p></div></div>
        ) : (
          <div className="portal-list">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{job.title}</p>
                    <p className="portal-card-subtitle">{job.client_name ?? 'Cliente nao informado'}</p>
                    {job.due_at && <p className="portal-card-subtitle">Entrega em {new Date(job.due_at).toLocaleDateString('pt-BR')}</p>}
                  </div>
                  <span className={clsx('portal-pill', statusTone(job.status))}>{STATUS_LABELS[job.status] ?? job.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
