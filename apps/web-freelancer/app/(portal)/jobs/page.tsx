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
  source: 'briefing' | 'ops_job' | 'trello_card';
  board_name?: string | null;
  list_name?: string | null;
  due_complete?: boolean;
};

// Platform/source icons
const SOURCE_EMOJI: Record<string, string> = {
  briefing: '✍️',
  ops_job: '⚙️',
  trello_card: '◈',
};

const STATUS_EMOJI: Record<string, string> = {
  done: '✅', published: '✅',
  blocked: '🚫',
  in_progress: '🔥', producao: '🔥', copy_ia: '🤖',
  in_review: '👀', revisao: '👀',
  awaiting_approval: '🕐', aprovacao: '🕐',
  ready: '🟢', approved: '🟢',
  planned: '📋', briefing: '📋', alinhamento: '📋',
  intake: '📥', iclips_in: '📥',
  allocated: '👤',
  iclips_out: '📤',
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing', iclips_in: 'Entrada', alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA', aprovacao: 'Aprovação', producao: 'Produção',
  revisao: 'Revisão', iclips_out: 'Saída', done: 'Concluído',
  intake: 'Entrada', planned: 'Planejado', ready: 'Pronto',
  allocated: 'Alocado', in_progress: 'Em produção', in_review: 'Em revisão',
  awaiting_approval: 'Aguard. aprovação', approved: 'Aprovado', blocked: 'Bloqueado',
};

function getUrgency(job: Job, today: Date) {
  if (job.source === 'trello_card' && job.due_complete) return { emoji: '✅', color: '#13DEB9', label: 'Prazo cumprido', badge: null, score: 10 };
  if (['done', 'published'].includes(job.status)) return { emoji: '✅', color: '#13DEB9', label: 'Concluído', badge: null, score: 10 };
  if (job.status === 'blocked') return { emoji: '🚫', color: '#ff4444', label: 'Bloqueado', badge: 'BLOQUEADO', score: 1 };
  if (!job.due_at) return { emoji: '📋', color: '#666', label: 'Sem prazo', badge: null, score: 9 };
  const due = new Date(job.due_at); due.setHours(0, 0, 0, 0);
  if (due < today) {
    const days = Math.ceil((today.getTime() - due.getTime()) / 86400000);
    return { emoji: '🔴', color: '#ff4444', label: `Atrasado ${days}d`, badge: days === 1 ? '+1 DIA' : `+${days} DIAS`, score: 0 };
  }
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { emoji: '🚨', color: '#ff4444', label: 'Vence HOJE', badge: 'HOJE!', score: 1 };
  if (diff === 1) return { emoji: '⚡', color: '#F8A800', label: 'Amanhã', badge: 'AMANHÃ', score: 2 };
  if (diff <= 3) return { emoji: '⚠️', color: '#F8A800', label: `${diff} dias`, badge: `${diff}d`, score: 3 };
  if (diff <= 7) return { emoji: '🟠', color: '#e85219', label: `${diff} dias`, badge: `${diff}d`, score: 4 };
  return { emoji: '📅', color: '#888', label: `${diff} dias`, badge: `${diff}d`, score: 5 };
}

export default function JobsPage() {
  const { data, isLoading } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);
  const jobs = data?.jobs ?? [];

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Sort by urgency score
  const sorted = [...jobs]
    .map(j => ({ job: j, urg: getUrgency(j, today) }))
    .sort((a, b) => a.urg.score - b.urg.score);

  const overdueCount = sorted.filter(({ urg }) => urg.score === 0).length;
  const todayCount = sorted.filter(({ urg }) => urg.score === 1 && urg.emoji === '🚨').length;
  const doneCount = jobs.filter(j => ['done', 'published'].includes(j.status)).length;

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Execução</span>
        <h2 className="portal-page-title">◈ Jobs atribuídos</h2>
        <p className="portal-page-subtitle">
          Seus itens ativos, ordenados por urgência do prazo.
        </p>
      </div>

      {/* Summary */}
      {!isLoading && jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {overdueCount > 0 && (
            <div style={{ background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔴</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ff4444', lineHeight: 1 }}>{overdueCount}</div>
                <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 2 }}>Atrasados</div>
              </div>
            </div>
          )}
          {todayCount > 0 && (
            <div style={{ background: 'rgba(232,82,25,0.12)', border: '1px solid rgba(232,82,25,0.3)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--portal-accent)', lineHeight: 1 }}>{todayCount}</div>
                <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 2 }}>Hoje</div>
              </div>
            </div>
          )}
          <div style={{ background: 'rgba(19,222,185,0.08)', border: '1px solid rgba(19,222,185,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#13DEB9', lineHeight: 1 }}>{doneCount}</div>
              <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 2 }}>Prontos</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--portal-border)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--portal-text)', lineHeight: 1 }}>{jobs.length}</div>
              <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 2 }}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Job list */}
      {isLoading ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando jobs...</p>
          </div>
        </section>
      ) : !jobs.length ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p className="portal-card-title">Nenhum job atribuído</p>
            <p className="portal-card-subtitle">Quando você for alocado em um job, ele aparece aqui.</p>
          </div>
        </section>
      ) : (
        <section className="portal-card">
          <div className="portal-list">
            {sorted.map(({ job, urg }) => {
              const statusEmoji = job.source === 'trello_card' ? '◈' : (STATUS_EMOJI[job.status] ?? '📋');
              const statusLabel = job.source === 'trello_card' ? (job.list_name ?? job.status) : (STATUS_LABELS[job.status] ?? job.status);
              const isDone = ['done', 'published'].includes(job.status) || (job.source === 'trello_card' && !!job.due_complete);
              return (
                <Link key={job.id} href={`/jobs/${job.id}?source=${job.source}`} className="portal-list-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Urgency icon */}
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{urg.emoji}</span>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="portal-card-title" style={{
                        marginBottom: 3,
                        textDecoration: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.6 : 1,
                      }}>
                        {job.title}
                      </p>
                      <p className="portal-card-subtitle">
                        {job.client_name ?? '—'}
                      </p>
                      {/* Badges row */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {/* Status / list badge */}
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: isDone ? 'rgba(19,222,185,0.15)' : 'rgba(255,255,255,0.08)',
                          color: isDone ? '#13DEB9' : 'var(--portal-muted)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {statusEmoji} {statusLabel}
                        </span>
                        {/* Source badge */}
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 6,
                          background: job.source === 'trello_card' ? 'rgba(93,135,255,0.12)' : 'rgba(255,255,255,0.05)',
                          color: job.source === 'trello_card' ? '#5D87FF' : 'var(--portal-muted)',
                          fontWeight: job.source === 'trello_card' ? 700 : 400,
                        }}>
                          {SOURCE_EMOJI[job.source]}{' '}
                          {job.source === 'trello_card'
                            ? (job.board_name ?? 'Kanban')
                            : job.source === 'ops_job' ? 'Operação' : 'Briefing'}
                        </span>
                      </div>
                    </div>

                    {/* Urgency badge */}
                    {urg.badge && (
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <div style={{
                          fontSize: 11, fontWeight: 800, color: urg.color,
                          background: `${urg.color}20`, borderRadius: 8, padding: '5px 10px',
                          letterSpacing: urg.score <= 1 ? '0.05em' : '0',
                        }}>
                          {urg.badge}
                        </div>
                        {job.due_at && !isDone && (
                          <div style={{ fontSize: 9, color: 'var(--portal-muted)', marginTop: 3 }}>
                            {new Date(job.due_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )}
                    <span style={{ color: 'var(--portal-muted)', fontSize: 14, flexShrink: 0 }}>›</span>
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
