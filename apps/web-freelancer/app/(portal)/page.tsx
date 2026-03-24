'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';
import clsx from 'clsx';

type Profile = {
  id: string;
  display_name: string;
  hourly_rate_brl: string | null;
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

type Payable = {
  id: string;
  period_month: string;
  amount_brl: string;
  status: string;
};

type Job = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  client_name: string | null;
  source: 'briefing' | 'ops_job';
};

function useElapsed(startedAt: string) {
  const [secs, setSecs] = useState(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  useEffect(() => {
    const timer = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  const pad = (v: number) => String(v).padStart(2, '0');
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function urgencyInfo(job: Job, now: Date) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (!['done', 'published'].includes(job.status)) {
    if (!job.due_at) return { emoji: '📋', color: '#888', label: 'Sem prazo', score: 99 };
    const due = new Date(job.due_at);
    if (due < today) return { emoji: '🔴', color: '#ff4444', label: 'ATRASADO', score: 1 };
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return { emoji: '🚨', color: '#ff4444', label: 'HOJE!', score: 2 };
    if (diff === 1) return { emoji: '⚡', color: '#F8A800', label: 'AMANHÃ', score: 3 };
    if (diff <= 3) return { emoji: '⚠️', color: '#F8A800', label: `${diff}d`, score: 4 };
    return { emoji: '🟠', color: '#e85219', label: `${diff}d`, score: 5 };
  }
  return { emoji: '✅', color: '#13DEB9', label: 'Pronto', score: 10 };
}

function ActiveTimer({ timer, freelancerId, onStopped }: {
  timer: { briefing_id: string; briefing_title?: string; started_at: string };
  freelancerId: string;
  onStopped: () => void;
}) {
  const elapsed = useElapsed(timer.started_at);
  const [stopping, setStopping] = useState(false);
  const stop = async () => {
    setStopping(true);
    try { await apiPost('/freelancers/timer/stop', { freelancer_id: freelancerId, briefing_id: timer.briefing_id }); onStopped(); }
    finally { setStopping(false); }
  };
  return (
    <section style={{
      background: 'linear-gradient(135deg, rgba(232,82,25,0.15) 0%, rgba(248,168,0,0.10) 100%)',
      border: '2px solid rgba(232,82,25,0.4)', borderRadius: 16, padding: 20,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 36 }}>⏱️</div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--portal-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          Timer ativo agora
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--portal-text)' }}>{timer.briefing_title ?? 'Job em execução'}</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--portal-accent)', fontVariantNumeric: 'tabular-nums', minWidth: 90, textAlign: 'center' }}>
        {elapsed}
      </div>
      <button onClick={stop} disabled={stopping}
        style={{
          background: 'rgba(255,68,68,0.15)', border: '1.5px solid rgba(255,68,68,0.4)',
          color: '#ff6b6b', borderRadius: 10, padding: '10px 20px', cursor: 'pointer',
          fontWeight: 700, fontSize: 13,
        }}>
        {stopping ? 'Parando…' : '⏹ Parar'}
      </button>
    </section>
  );
}

export default function DashboardPage() {
  const { data: profile, mutate } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data: entriesData } = useSWR(`/freelancers/portal/me/entries?month=${currentMonth}`, swrFetcher);
  const { data: payablesData } = useSWR('/freelancers/portal/me/payables', swrFetcher);
  const { data: jobsData } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);

  const totalMinutes = (entriesData?.entries ?? []).reduce((s: number, e: any) => s + (e.minutes ?? 0), 0);
  const pendingPayable = (payablesData?.payables ?? []).find((p: Payable) => p.status === 'open');
  const activeTimers = profile?.active_timers ?? [];
  const allJobs = jobsData?.jobs ?? [];

  // Priority jobs: overdue + due today/soon, sorted by urgency
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const priorityJobs = allJobs
    .filter(j => !['done', 'published'].includes(j.status))
    .map(j => ({ job: j, urg: urgencyInfo(j, today) }))
    .sort((a, b) => a.urg.score - b.urg.score)
    .slice(0, 4);

  const overdueCount = allJobs.filter(j => j.due_at && new Date(j.due_at) < today && !['done', 'published'].includes(j.status)).length;
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayCount = allJobs.filter(j => j.due_at && j.due_at.slice(0, 10) === todayKey && !['done', 'published'].includes(j.status)).length;
  const doneCount = allJobs.filter(j => ['done', 'published'].includes(j.status)).length;

  function fmtH(m: number) {
    if (!m) return '0h';
    const h = Math.floor(m / 60), r = m % 60;
    return r > 0 ? `${h}h ${r}min` : `${h}h`;
  }

  if (!profile) {
    return (
      <div className="portal-empty">
        <div>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <p className="portal-card-title">Carregando...</p>
        </div>
      </div>
    );
  }

  const firstName = profile.display_name.split(' ')[0];

  return (
    <div className="portal-page">
      {/* Greeting */}
      <div>
        <span className="portal-kicker">Workspace</span>
        <h2 className="portal-page-title">
          {overdueCount > 0 ? '🚨' : todayCount > 0 ? '👋' : '🌟'} Olá, {firstName}!
        </h2>
        <p className="portal-page-subtitle">
          {overdueCount > 0
            ? `Você tem ${overdueCount} job${overdueCount > 1 ? 's' : ''} atrasado${overdueCount > 1 ? 's' : ''}. Vamos resolver!`
            : todayCount > 0
            ? `${todayCount} job${todayCount > 1 ? 's' : ''} vence${todayCount === 1 ? '' : 'm'} hoje. Bora!`
            : 'Tudo em dia. Bom trabalho!'}
        </p>
      </div>

      {/* Active timers */}
      {activeTimers.map(t => (
        <ActiveTimer key={t.briefing_id} timer={t} freelancerId={profile.id} onStopped={() => mutate()} />
      ))}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* Hours */}
        <div style={{
          flex: '1 1 140px', background: 'rgba(93,135,255,0.10)',
          border: '1px solid rgba(93,135,255,0.25)', borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏱</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#5D87FF' }}>{fmtH(totalMinutes)}</div>
          <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Horas em {now.toLocaleString('pt-BR', { month: 'long' })}</div>
          {profile.hourly_rate_brl && totalMinutes > 0 && (
            <div style={{ fontSize: 12, color: '#5D87FF', marginTop: 4, fontWeight: 600 }}>
              ≈ R$ {((totalMinutes / 60) * parseFloat(profile.hourly_rate_brl)).toFixed(0)}
            </div>
          )}
        </div>

        {/* Payment */}
        <div style={{
          flex: '1 1 140px',
          background: pendingPayable ? 'rgba(19,222,185,0.10)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${pendingPayable ? 'rgba(19,222,185,0.3)' : 'var(--portal-border)'}`,
          borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>💰</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: pendingPayable ? '#13DEB9' : 'var(--portal-muted)' }}>
            {pendingPayable ? `R$ ${parseFloat(pendingPayable.amount_brl).toFixed(0)}` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>
            {pendingPayable ? 'A receber' : 'Sem pagamento aberto'}
          </div>
        </div>

        {/* Jobs done */}
        <div style={{
          flex: '1 1 140px', background: 'rgba(19,222,185,0.08)',
          border: '1px solid rgba(19,222,185,0.2)', borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#13DEB9' }}>{doneCount}</div>
          <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Jobs concluídos</div>
        </div>

        {/* Overdue / active */}
        {overdueCount > 0 ? (
          <div style={{
            flex: '1 1 140px', background: 'rgba(255,68,68,0.10)',
            border: '1px solid rgba(255,68,68,0.3)', borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔴</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#ff4444' }}>{overdueCount}</div>
            <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Atrasados — urgente!</div>
          </div>
        ) : (
          <div style={{
            flex: '1 1 140px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--portal-border)', borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--portal-text)' }}>{allJobs.length}</div>
            <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Jobs no total</div>
          </div>
        )}
      </div>

      {/* Priority queue */}
      {priorityJobs.length > 0 && (
        <section className="portal-card">
          <div className="portal-section-head" style={{ marginBottom: 14 }}>
            <h3 className="portal-section-title">🎯 Fazer agora</h3>
            <Link href="/jobs" style={{ fontSize: 12, color: 'var(--portal-accent)', textDecoration: 'none' }}>
              Ver todos →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priorityJobs.map(({ job, urg }) => (
              <Link key={job.id} href={`/jobs/${job.id}?source=${job.source}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: `${urg.color}0d`,
                  border: `1.5px solid ${urg.color}30`,
                  borderRadius: 12, padding: '12px 14px',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{urg.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--portal-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--portal-muted)', margin: '2px 0 0' }}>{job.client_name ?? '—'}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: urg.color,
                    background: `${urg.color}1a`, borderRadius: 8, padding: '4px 10px', flexShrink: 0,
                  }}>{urg.label}</span>
                  <span style={{ color: 'var(--portal-muted)', fontSize: 14 }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {[
          { href: '/jobs',       emoji: '◈',  label: 'Escopos',    color: '#e85219' },
          { href: '/pagamentos', emoji: '💰', label: 'Pagamentos', color: '#F8A800' },
          { href: '/agenda',     emoji: '📅', label: 'Agenda',     color: '#5D87FF' },
          { href: '/horas',      emoji: '★',  label: 'Score SLA',  color: '#13DEB9' },
          { href: '/perfil',     emoji: '◉',  label: 'Perfil',     color: '#A78BFA' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: `${item.color}0d`, border: `1px solid ${item.color}25`,
              borderRadius: 12, padding: '16px 12px', textAlign: 'center',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
