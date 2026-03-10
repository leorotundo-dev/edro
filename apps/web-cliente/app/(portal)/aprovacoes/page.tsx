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
  const { data, isLoading } = useSWR<{ jobs: Job[] }>('/portal/client/jobs?status=review', swrFetcher);
  const jobs = (data?.jobs ?? []).filter((job) => job.status === 'review');

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Aprovacoes</span>
        <h2 className="portal-page-title">Pontos que aguardam retorno</h2>
        <p className="portal-page-subtitle">Tudo o que depende da sua validacao para seguir o fluxo de producao.</p>
      </div>

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando aprovacoes</p><p className="portal-card-subtitle">Sincronizando seus itens pendentes.</p></div></div>
        ) : jobs.length === 0 ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhuma aprovacao pendente</p><p className="portal-card-subtitle">Quando houver materiais aguardando seu retorno, eles aparecerao aqui.</p></div></div>
        ) : (
          <div className="portal-list">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{job.title}</p>
                    <p className="portal-card-subtitle">Atualizado em {new Date(job.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="portal-pill portal-pill-warning">Aguardando aprovacao</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
