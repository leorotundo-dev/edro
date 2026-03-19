'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import clsx from 'clsx';

type StudioBriefing = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
  copy_count: string;
  payload?: Record<string, any> | null;
};

const STATUS_LABELS: Record<string, string> = {
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

function statusTone(s: string) {
  if (s === 'copy_ia' || s === 'producao') return 'portal-pill-accent';
  if (s === 'aprovacao' || s === 'revisao') return 'portal-pill-warning';
  if (s === 'done') return 'portal-pill-success';
  return 'portal-pill-neutral';
}

function isOverdue(dueAt: string | null) {
  return dueAt && new Date(dueAt) < new Date();
}

export default function StudioPage() {
  const { data, isLoading } = useSWR<{ briefings?: StudioBriefing[] }>(
    '/freelancers/portal/me/studio',
    swrFetcher,
  );
  const briefings = data?.briefings ?? [];

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Creative Studio</span>
        <h2 className="portal-page-title">Produção de copy</h2>
        <p className="portal-page-subtitle">
          Briefings atribuídos a você com capacidade de edição, geração com IA e envio para revisão.
        </p>
      </div>

      {isLoading ? (
        <section className="portal-card">
          <div className="portal-empty">
            <p className="portal-card-subtitle">Carregando briefings...</p>
          </div>
        </section>
      ) : !briefings.length ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div>
              <p className="portal-card-title">Nenhum briefing ativo</p>
              <p className="portal-card-subtitle">
                Quando você for atribuído a um briefing de copy, ele aparece aqui.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="portal-card">
          <div className="portal-list">
            {briefings.map((b) => {
              const overdue = isOverdue(b.due_at);
              const copyCount = parseInt(b.copy_count ?? '0', 10);
              return (
                <Link
                  key={b.id}
                  href={`/studio/${b.id}`}
                  className="portal-list-card"
                >
                  <div className="portal-list-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="portal-card-title" style={{ marginBottom: 4 }}>{b.title}</p>
                      <p className="portal-card-subtitle">
                        {b.client_name ?? 'Cliente não informado'}
                        {b.due_at && (
                          <>
                            {' · '}
                            <span style={{ color: overdue ? 'var(--portal-danger)' : undefined }}>
                              {overdue ? 'Venceu em ' : 'Prazo: '}
                              {new Date(b.due_at).toLocaleDateString('pt-BR')}
                            </span>
                          </>
                        )}
                        {copyCount > 0 && (
                          <> · {copyCount} {copyCount === 1 ? 'versão' : 'versões'}</>
                        )}
                      </p>
                      {b.payload?.platform && (
                        <p className="portal-card-subtitle" style={{ marginTop: 2, opacity: 0.6, fontSize: '0.7rem' }}>
                          {String(b.payload.platform).toUpperCase()}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                      <span className={clsx('portal-pill', statusTone(b.status))}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      {overdue && (
                        <span className="portal-pill portal-pill-error">Atrasado</span>
                      )}
                      {copyCount === 0 && (
                        <span className="portal-pill portal-pill-neutral" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                          Sem copy
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
