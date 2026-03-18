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
  source: 'briefing' | 'ops_job';
};

const BRIEFING_STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  iclips_out: 'iClips saída',
  done: 'Concluído',
};

const OPS_STATUS_LABELS: Record<string, string> = {
  intake: 'Entrada',
  planned: 'Planejado',
  ready: 'Pronto',
  allocated: 'Alocado',
  in_progress: 'Em produção',
  in_review: 'Em revisão',
  awaiting_approval: 'Aguard. aprovação',
  approved: 'Aprovado',
  blocked: 'Bloqueado',
  done: 'Concluído',
};

function getStatusLabel(status: string, source: 'briefing' | 'ops_job') {
  return source === 'ops_job'
    ? (OPS_STATUS_LABELS[status] ?? status)
    : (BRIEFING_STATUS_LABELS[status] ?? status);
}

function statusTone(status: string, source: 'briefing' | 'ops_job') {
  if (status === 'done') return 'portal-pill-success';
  if (status === 'blocked') return 'portal-pill-error';
  if (
    status === 'in_progress' ||
    status === 'in_review' ||
    status === 'producao' ||
    status === 'copy_ia'
  )
    return 'portal-pill-accent';
  if (
    status === 'awaiting_approval' ||
    status === 'aprovacao' ||
    status === 'revisao'
  )
    return 'portal-pill-warning';
  return 'portal-pill-neutral';
}

export default function JobsPage() {
  const { data, isLoading } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);
  const jobs = data?.jobs ?? [];

  const now = new Date();
  const overdue = jobs.filter(
    (j) => j.due_at && new Date(j.due_at) < now && !['done', 'published'].includes(j.status),
  );
  const active = jobs.filter(
    (j) => !j.due_at || new Date(j.due_at) >= now || ['done', 'published'].includes(j.status),
  );

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Execução</span>
        <h2 className="portal-page-title">Jobs atribuídos</h2>
        <p className="portal-page-subtitle">
          Itens em que você está alocado, com contexto de cliente, prazo e status.
        </p>
      </div>

      {isLoading ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div>
              <p className="portal-card-title">Carregando jobs</p>
              <p className="portal-card-subtitle">Sincronizando atribuições.</p>
            </div>
          </div>
        </section>
      ) : !jobs.length ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div>
              <p className="portal-card-title">Nenhum job atribuído</p>
              <p className="portal-card-subtitle">
                Quando você for alocado em um job, ele aparece aqui.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="portal-card">
              <div className="portal-section-head" style={{ marginBottom: 12 }}>
                <h3 className="portal-section-title">Prazo vencido</h3>
                <span className="portal-pill portal-pill-error">{overdue.length}</span>
              </div>
              <div className="portal-list">
                {overdue.map((job) => (
                  <JobRow key={job.id} job={job} overdue />
                ))}
              </div>
            </section>
          )}

          <section className="portal-card">
            {overdue.length > 0 && (
              <div className="portal-section-head" style={{ marginBottom: 12 }}>
                <h3 className="portal-section-title">Ativos</h3>
                <span className="portal-pill portal-pill-neutral">{active.length}</span>
              </div>
            )}
            {active.length === 0 ? (
              <div className="portal-empty">
                <div>
                  <p className="portal-card-subtitle">Sem outros jobs ativos.</p>
                </div>
              </div>
            ) : (
              <div className="portal-list">
                {active.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function JobRow({ job, overdue }: { job: Job; overdue?: boolean }) {
  return (
    <Link href={`/jobs/${job.id}?source=${job.source}`} className="portal-list-card">
      <div className="portal-list-row">
        <div>
          <p className="portal-card-title">{job.title}</p>
          <p className="portal-card-subtitle">
            {job.client_name ?? 'Cliente não informado'}
            {job.due_at && (
              <>
                {' · '}
                {overdue ? 'Venceu em ' : 'Entrega em '}
                {new Date(job.due_at).toLocaleDateString('pt-BR')}
              </>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span className={clsx('portal-pill', statusTone(job.status, job.source))}>
            {getStatusLabel(job.status, job.source)}
          </span>
          <span
            className="portal-pill portal-pill-neutral"
            style={{ fontSize: '0.65rem', opacity: 0.6 }}
          >
            {job.source === 'ops_job' ? 'Operação' : 'Briefing'}
          </span>
        </div>
      </div>
    </Link>
  );
}
