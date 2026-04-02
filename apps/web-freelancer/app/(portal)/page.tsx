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
  avatar_url: string | null;
  skills_json: unknown[] | null;
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

function WelcomeCard({ profile }: { profile: Profile }) {
  const profileComplete = !!(profile.hourly_rate_brl && (profile.skills_json as unknown[])?.length);
  const steps = [
    { done: profileComplete, label: 'Complete seu perfil', sub: 'Taxa horária, skills e disponibilidade', href: '/perfil', cta: 'Ir para Perfil →' },
    { done: false,           label: 'Explore o Mercado de Escopos', sub: 'Veja jobs disponíveis e aceite os que se encaixam no seu perfil', href: '/jobs', cta: 'Ver Mercado →' },
    { done: false,           label: 'Aguarde seu primeiro escopo alocado', sub: 'A equipe Edro vai enviar uma proposta assim que houver fit', href: null, cta: null },
  ];

  return (
    <section style={{
      background: 'linear-gradient(135deg, rgba(93,135,255,0.12) 0%, rgba(19,222,185,0.07) 100%)',
      border: '1.5px solid rgba(93,135,255,0.3)',
      borderRadius: 16, padding: '24px 20px',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#5D87FF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Primeiros passos
        </div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
          Bem-vindo ao Portal Edro! 🚀
        </h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          Seu contrato está assinado. Siga os passos abaixo para começar a trabalhar.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            background: step.done ? 'rgba(19,222,185,0.07)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${step.done ? 'rgba(19,222,185,0.2)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{
              width: 28, height: 28, flexShrink: 0, borderRadius: '50%',
              background: step.done ? 'rgba(19,222,185,0.2)' : 'rgba(93,135,255,0.15)',
              border: `2px solid ${step.done ? '#13DEB9' : 'rgba(93,135,255,0.4)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800,
              color: step.done ? '#13DEB9' : 'rgba(93,135,255,0.8)',
            }}>
              {step.done ? '✓' : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: step.done ? 'rgba(255,255,255,0.5)' : '#fff', textDecoration: step.done ? 'line-through' : 'none' }}>
                {step.label}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                {step.sub}
              </p>
              {!step.done && step.href && step.cta && (
                <Link href={step.href} style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#5D87FF', textDecoration: 'none' }}>
                  {step.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
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
            : allJobs.length === 0 && jobsData
            ? 'Contrato assinado. Siga os primeiros passos abaixo.'
            : 'Tudo em dia. Bom trabalho!'}
        </p>
      </div>

      {/* Active timers */}
      {activeTimers.map(t => (
        <ActiveTimer key={t.briefing_id} timer={t} freelancerId={profile.id} onStopped={() => mutate()} />
      ))}

      {/* Pending acceptance alert */}
      {(() => {
        const pending = allJobs.filter(j => j.pending_acceptance);
        if (!pending.length) return null;
        return (
          <Link href="/jobs" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(248,168,0,0.10)',
              border: '1.5px solid rgba(248,168,0,0.45)',
              borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>🤝</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#F8A800' }}>
                  {pending.length} escopo{pending.length !== 1 ? 's' : ''} aguardando seu aceite
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  Responda antes de começar a executar.
                </p>
              </div>
              <span style={{ fontSize: 14, color: '#F8A800' }}>›</span>
            </div>
          </Link>
        );
      })()}

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

      {/* Welcome card — only shown when no jobs yet (first-time freelancer) */}
      {jobsData && allJobs.length === 0 && (
        <WelcomeCard profile={profile} />
      )}

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
