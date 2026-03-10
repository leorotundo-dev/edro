'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import Link from 'next/link';
import clsx from 'clsx';

type ClientMe = {
  id: string;
  name: string;
  status: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

type Invoice = {
  id: string;
  description: string;
  amount_brl: string;
  status: string;
  due_date: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return 'Sem data';
  return new Date(d).toLocaleDateString('pt-BR');
}

function brl(val: string) {
  return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function invoiceTone(status: string) {
  if (status === 'paid') return 'portal-pill-success';
  if (status === 'overdue') return 'portal-pill-danger';
  if (status === 'sent') return 'portal-pill-warning';
  return 'portal-pill-neutral';
}

function invoiceLabel(status: string) {
  if (status === 'paid') return 'Paga';
  if (status === 'overdue') return 'Vencida';
  if (status === 'sent') return 'Em aberto';
  return 'Rascunho';
}

export default function DashboardPage() {
  const { data: me } = useSWR<{ client: ClientMe }>('/portal/client/me', swrFetcher);
  const { data: jobsData } = useSWR<{ jobs: Job[] }>('/portal/client/jobs?limit=3', swrFetcher);
  const { data: invData } = useSWR<{ invoices: Invoice[] }>('/portal/client/invoices?limit=1', swrFetcher);

  const jobs = jobsData?.jobs ?? [];
  const lastInvoice = invData?.invoices?.[0];
  const firstName = me?.client?.name?.split(' ')[0] ?? 'cliente';

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Workspace cliente</span>
          <h2 className="portal-page-title">Ola, {firstName}</h2>
          <p className="portal-page-subtitle">
            Aqui voce acompanha o que esta em andamento, o que precisa de aprovacao e o status financeiro do seu relacionamento com a Edro.
          </p>
        </div>
      </div>

      <section className="portal-hero-card">
        <div className="portal-section-head">
          <div>
            <h3 className="portal-section-title">Resumo operacional</h3>
            <p className="portal-card-subtitle">Visao rapida do que ja esta sendo executado pela agencia.</p>
          </div>
        </div>
        <div className="portal-stat-grid">
          <div className="portal-stat-card">
            <div className="portal-stat-label">Projetos recentes</div>
            <div className="portal-stat-value">{jobs.length}</div>
            <div className="portal-stat-meta">Jobs ativos ou atualizados no periodo mais recente.</div>
          </div>
          <div className="portal-stat-card">
            <div className="portal-stat-label">Ultima fatura</div>
            <div className="portal-stat-value">{lastInvoice ? brl(lastInvoice.amount_brl) : 'Sem emissao'}</div>
            <div className="portal-stat-meta">
              {lastInvoice ? `${invoiceLabel(lastInvoice.status)} · ${fmtDate(lastInvoice.due_date)}` : 'Nenhuma cobranca registrada.'}
            </div>
          </div>
        </div>
      </section>

      <section className="portal-card">
        <div className="portal-section-head">
          <div>
            <h3 className="portal-section-title">Projetos recentes</h3>
            <p className="portal-card-subtitle">Acesse rapidamente o que foi atualizado por ultimo.</p>
          </div>
          <Link href="/jobs" className="portal-section-link">Ver todos</Link>
        </div>

        {jobs.length === 0 ? (
          <div className="portal-empty">
            <div>
              <p className="portal-card-title">Nenhum projeto encontrado</p>
              <p className="portal-card-subtitle">Quando a agencia publicar novos jobs, eles aparecerao aqui.</p>
            </div>
          </div>
        ) : (
          <div className="portal-list">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{job.title}</p>
                    <p className="portal-card-subtitle">Atualizado em {fmtDate(job.updated_at)}</p>
                  </div>
                  <span className={clsx('portal-pill', job.status === 'review' ? 'portal-pill-warning' : job.status === 'done' ? 'portal-pill-success' : 'portal-pill-neutral')}>
                    {job.status === 'review' ? 'Em aprovacao' : job.status === 'done' ? 'Concluido' : 'Em andamento'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {lastInvoice && (
        <section className="portal-note">
          <div className="portal-section-head" style={{ marginBottom: 0 }}>
            <div>
              <h3 className="portal-section-title">Financeiro em foco</h3>
              <p className="portal-card-subtitle">Ultimo documento emitido para sua conta.</p>
            </div>
            <span className={clsx('portal-pill', invoiceTone(lastInvoice.status))}>{invoiceLabel(lastInvoice.status)}</span>
          </div>
        </section>
      )}
    </div>
  );
}
