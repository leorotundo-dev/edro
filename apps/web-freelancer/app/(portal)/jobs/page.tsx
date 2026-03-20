'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher, apiPatch, apiPost } from '@/lib/api';

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
  pending_acceptance?: boolean;  // true = aguardando aceite do freelancer
};

type Groups = {
  overdue: Job[];
  today: Job[];
  tomorrow: Job[];
  thisWeek: Job[];
  later: Job[];
  noDue: Job[];
  done: Job[];
};

const STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing', alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA', aprovacao_interna: 'Aprov. Interna',
  producao: 'Produção', ajustes: 'Ajustes',
  aprovacao_cliente: 'Aprov. Cliente', concluido: 'Concluído',
  intake: 'Entrada', planned: 'Planejado', ready: 'Pronto',
  allocated: 'Alocado', in_progress: 'Em produção', in_review: 'Em revisão',
  awaiting_approval: 'Aguard. aprovação', approved: 'Aprovado', blocked: 'Bloqueado',
};

function parseDay(dateStr: string): Date {
  // Handles both "2024-03-19" and "2024-03-19T23:59:00"
  return new Date(dateStr.slice(0, 10) + 'T00:00:00');
}

function groupJobs(jobs: Job[], today: Date): Groups {
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 6);
  const g: Groups = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [], noDue: [], done: [] };

  for (const j of jobs) {
    const isDone = ['done', 'published'].includes(j.status) || (j.source === 'trello_card' && !!j.due_complete);
    if (isDone) { g.done.push(j); continue; }
    if (!j.due_at) { g.noDue.push(j); continue; }
    const due = parseDay(j.due_at);
    if (due < today) g.overdue.push(j);
    else if (due.toDateString() === today.toDateString()) g.today.push(j);
    else if (due.toDateString() === tomorrow.toDateString()) g.tomorrow.push(j);
    else if (due <= weekEnd) g.thisWeek.push(j);
    else g.later.push(j);
  }

  return g;
}

// ── Job row ───────────────────────────────────────────────────────────────────

function JobRow({
  job, today, completing, onComplete, onRespond, responding,
}: {
  job: Job;
  today: Date;
  completing: string | null;
  onComplete: (id: string) => void;
  onRespond: (id: string, source: string, action: 'accept' | 'reject') => void;
  responding: string | null;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isDone = ['done', 'published', 'concluido'].includes(job.status) || (job.source === 'trello_card' && !!job.due_complete);
  const canComplete = job.source === 'trello_card' && !isDone;
  const needsResponse = job.pending_acceptance && !isDone;

  const statusLabel = job.source === 'trello_card'
    ? (job.list_name ?? job.status)
    : (STATUS_LABELS[job.status] ?? job.status);

  const due = job.due_at ? parseDay(job.due_at) : null;
  const diffDays = due ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : null;
  const isOverdue = diffDays !== null && diffDays < 0;
  const isToday = diffDays === 0;
  const isBusy = isOverdue || isToday;

  const dueBadge = diffDays === null ? null
    : diffDays < 0 ? `+${Math.abs(diffDays)}d`
    : diffDays === 0 ? 'Hoje'
    : diffDays === 1 ? 'Amanhã'
    : `${diffDays}d`;
  const dueColor = isOverdue ? '#ff4444' : isToday ? '#F8A800' : '#5D87FF';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 18px',
      background: isOverdue
        ? 'rgba(255,68,68,0.04)'
        : isToday
        ? 'rgba(248,168,0,0.04)'
        : 'transparent',
      borderBottom: '1px solid var(--portal-border)',
      transition: 'background 0.15s',
    }}>
      {/* Status dot */}
      <div style={{
        width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
        background: isDone
          ? '#13DEB9'
          : isOverdue ? '#ff4444'
          : isToday ? '#F8A800'
          : 'rgba(255,255,255,0.15)',
        boxShadow: isBusy && !isDone ? `0 0 6px ${dueColor}80` : 'none',
      }} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/jobs/${job.id}?source=${job.source}`}
          style={{ textDecoration: 'none' }}
        >
          <p style={{
            fontSize: 14, fontWeight: 700, margin: 0,
            color: isDone ? 'var(--portal-muted)' : 'var(--portal-text)',
            textDecoration: isDone ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.title}
          </p>
        </Link>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {job.client_name && (
            <span style={{ fontSize: 11, color: 'var(--portal-muted)' }}>{job.client_name}</span>
          )}
          {job.client_name && <span style={{ fontSize: 11, color: 'var(--portal-border)' }}>·</span>}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 5,
            background: 'rgba(255,255,255,0.06)', color: 'var(--portal-muted)',
          }}>
            {statusLabel}
          </span>
          {job.source === 'trello_card' && job.board_name && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
              background: 'rgba(93,135,255,0.12)', color: '#5D87FF',
            }}>
              ◈ {job.board_name}
            </span>
          )}
        </div>
      </div>

      {/* Due badge */}
      {dueBadge && !isDone && (
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 7, flexShrink: 0,
          color: dueColor, background: `${dueColor}18`,
          letterSpacing: isOverdue ? '0.02em' : '0',
        }}>
          {dueBadge}
        </span>
      )}

      {/* Action */}
      {needsResponse ? (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onRespond(job.id, job.source, 'accept')}
            disabled={responding === job.id}
            style={{
              background: 'rgba(19,222,185,0.10)', border: '1.5px solid rgba(19,222,185,0.35)',
              color: '#13DEB9', borderRadius: 8, padding: '5px 11px',
              cursor: 'pointer', fontWeight: 800, fontSize: 11,
            }}
          >
            {responding === job.id ? '...' : '✓ Aceitar'}
          </button>
          <button
            onClick={() => setShowRejectForm(v => !v)}
            style={{
              background: 'rgba(250,137,107,0.08)', border: '1.5px solid rgba(250,137,107,0.3)',
              color: '#FA896B', borderRadius: 8, padding: '5px 9px',
              cursor: 'pointer', fontWeight: 700, fontSize: 11,
            }}
          >
            ✕
          </button>
        </div>
      ) : canComplete ? (
        <button
          onClick={() => onComplete(job.id)}
          disabled={completing === job.id}
          style={{
            background: completing === job.id ? 'rgba(19,222,185,0.25)' : 'rgba(19,222,185,0.10)',
            border: '1.5px solid rgba(19,222,185,0.35)',
            color: '#13DEB9', borderRadius: 8,
            padding: '6px 13px', cursor: completing === job.id ? 'wait' : 'pointer',
            fontWeight: 800, fontSize: 12, flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {completing === job.id ? '...' : '✓ Concluir'}
        </button>
      ) : (
        <Link
          href={`/jobs/${job.id}?source=${job.source}`}
          style={{ color: 'var(--portal-muted)', fontSize: 14, flexShrink: 0 }}
        >
          ›
        </Link>
      )}
    </div>

    {/* Reject form */}
    {showRejectForm && (
      <div style={{
        padding: '10px 18px 14px', borderTop: '1px solid var(--portal-border)',
        background: 'rgba(250,137,107,0.04)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--portal-muted)', margin: '0 0 8px' }}>
          Por que está recusando este job?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Motivo (obrigatório)..."
            style={{
              flex: 1, background: 'var(--portal-bg)', border: '1px solid var(--portal-border)',
              borderRadius: 8, padding: '7px 11px', color: 'var(--portal-text)',
              fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={() => { if (rejectReason.trim()) { onRespond(job.id, job.source, 'reject'); setShowRejectForm(false); } }}
            disabled={!rejectReason.trim() || responding === job.id}
            style={{
              background: '#FA896B', border: 'none', borderRadius: 8, color: '#fff',
              padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              opacity: rejectReason.trim() ? 1 : 0.4,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    )}
  </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  emoji, title, color, count, jobs, today, completing, onComplete, onRespond, responding, defaultOpen = true,
}: {
  emoji: string; title: string; color: string; count: number;
  jobs: Job[]; today: Date; completing: string | null;
  onComplete: (id: string) => void;
  onRespond: (id: string, source: string, action: 'accept' | 'reject') => void;
  responding: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!jobs.length) return null;
  return (
    <section style={{
      background: 'var(--portal-card)',
      border: '1px solid var(--portal-border)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--portal-border)' : 'none',
        }}
      >
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color }}>{title}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
          background: `${color}1f`, color,
        }}>
          {count}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--portal-muted)', fontSize: 11 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && jobs.map(job => (
        <JobRow
          key={job.id}
          job={job}
          today={today}
          completing={completing}
          onComplete={onComplete}
          onRespond={onRespond}
          responding={responding}
        />
      ))}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { data, isLoading, mutate } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);
  const [completing,  setCompleting]  = useState<string | null>(null);
  const [responding,  setResponding]  = useState<string | null>(null);
  const [localDone,   setLocalDone]   = useState<Set<string>>(new Set());
  const [localAccepted, setLocalAccepted] = useState<Set<string>>(new Set());

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Apply optimistic updates
  const jobs: Job[] = (data?.jobs ?? []).map(j => {
    if (localDone.has(j.id) && j.source === 'trello_card') return { ...j, due_complete: true };
    if (localAccepted.has(j.id)) return { ...j, pending_acceptance: false, status: 'alinhamento' };
    return j;
  });

  const groups = groupJobs(jobs, today);

  const totalActive = groups.overdue.length + groups.today.length + groups.tomorrow.length
    + groups.thisWeek.length + groups.later.length + groups.noDue.length;
  const urgentCount = groups.overdue.length + groups.today.length;

  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  async function handleComplete(jobId: string) {
    setCompleting(jobId);
    setLocalDone(prev => new Set([...prev, jobId]));
    try {
      await apiPatch(`/freelancers/portal/me/trello-cards/${jobId}`, { due_complete: true });
      mutate();
    } catch {
      setLocalDone(prev => { const next = new Set(prev); next.delete(jobId); return next; });
    } finally {
      setCompleting(null);
    }
  }

  async function handleRespond(jobId: string, source: string, action: 'accept' | 'reject') {
    setResponding(jobId);
    if (action === 'accept') setLocalAccepted(prev => new Set([...prev, jobId]));
    try {
      await apiPost(`/freelancers/portal/me/jobs/${jobId}/respond`, { action, source });
      mutate();
    } catch {
      if (action === 'accept') setLocalAccepted(prev => { const next = new Set(prev); next.delete(jobId); return next; });
    } finally {
      setResponding(null);
    }
  }

  if (isLoading) {
    return (
      <div className="portal-page">
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p className="portal-card-subtitle">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">Execução</span>
        <h2 className="portal-page-title">
          {urgentCount > 0 ? '🚨' : '📋'} Demandas da semana
        </h2>
        <p className="portal-page-subtitle">
          {fmt(today)} – {fmt(weekEnd)}
          {' · '}
          {totalActive > 0
            ? `${totalActive} ativa${totalActive !== 1 ? 's' : ''}`
            : 'tudo em dia'}
          {groups.done.length > 0 && ` · ${groups.done.length} concluída${groups.done.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* KPI strip */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {groups.overdue.length > 0 && (
            <div style={{
              background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)',
              borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>🔴</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#ff4444', lineHeight: 1 }}>
                  {groups.overdue.length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 3 }}>Atrasados</div>
              </div>
            </div>
          )}
          {groups.today.length > 0 && (
            <div style={{
              background: 'rgba(248,168,0,0.12)', border: '1px solid rgba(248,168,0,0.3)',
              borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>🚨</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#F8A800', lineHeight: 1 }}>
                  {groups.today.length}
                </div>
                <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 3 }}>Vencem hoje</div>
              </div>
            </div>
          )}
          <div style={{
            background: 'rgba(19,222,185,0.08)', border: '1px solid rgba(19,222,185,0.2)',
            borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#13DEB9', lineHeight: 1 }}>
                {groups.done.length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 3 }}>Concluídos</div>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--portal-border)',
            borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--portal-text)', lineHeight: 1 }}>
                {jobs.length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 3 }}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!jobs.length && (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p className="portal-card-title">Nenhum job atribuído</p>
            <p className="portal-card-subtitle">Quando você for alocado em um card, ele aparece aqui.</p>
          </div>
        </section>
      )}

      {/* Pending acceptance — shown first if any */}
      {jobs.some(j => j.pending_acceptance) && (
        <section style={{
          background: 'rgba(93,135,255,0.06)', border: '2px solid rgba(93,135,255,0.3)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(93,135,255,0.2)' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#5D87FF' }}>🔔 Aguardando seu aceite</span>
          </div>
          {jobs.filter(j => j.pending_acceptance).map(job => (
            <JobRow key={job.id} job={job} today={today}
              completing={completing} onComplete={handleComplete}
              onRespond={handleRespond} responding={responding} />
          ))}
        </section>
      )}

      {/* Sections in urgency order */}
      <Section
        emoji="🔴" title="Atrasados" color="#ff4444"
        count={groups.overdue.length} jobs={groups.overdue}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
      />
      <Section
        emoji="🚨" title="Hoje" color="#F8A800"
        count={groups.today.length} jobs={groups.today}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
      />
      <Section
        emoji="⚡" title="Amanhã" color="#F8A800"
        count={groups.tomorrow.length} jobs={groups.tomorrow}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
      />
      <Section
        emoji="📅" title="Esta semana" color="#5D87FF"
        count={groups.thisWeek.length} jobs={groups.thisWeek}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
      />
      <Section
        emoji="🗓" title="Próximas semanas" color="var(--portal-muted)"
        count={groups.later.length} jobs={groups.later}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
        defaultOpen={false}
      />
      <Section
        emoji="○" title="Sem prazo definido" color="var(--portal-muted)"
        count={groups.noDue.length} jobs={groups.noDue}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
        defaultOpen={false}
      />

      {/* Done — collapsed by default */}
      <Section
        emoji="✅" title="Concluídos" color="#13DEB9"
        count={groups.done.length} jobs={groups.done}
        today={today} completing={completing} onComplete={handleComplete}
        onRespond={handleRespond} responding={responding}
        defaultOpen={false}
      />

    </div>
  );
}
