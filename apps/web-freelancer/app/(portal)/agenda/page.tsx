'use client';

import { useState, useMemo } from 'react';
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

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

// Returns urgency info for a job
function jobUrgency(job: Job, now: Date) {
  if (job.status === 'done') return { emoji: '✅', color: '#13DEB9', label: 'Concluído', priority: 0 };
  if (job.status === 'blocked') return { emoji: '🚫', color: '#ff4444', label: 'Bloqueado', priority: 1 };
  if (!job.due_at) return { emoji: '◈', color: '#888', label: 'Sem prazo', priority: 5 };
  const due = new Date(job.due_at);
  if (due < now) return { emoji: '🔴', color: '#ff4444', label: 'Atrasado', priority: 1 };
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return { emoji: '🚨', color: '#ff4444', label: 'Urgente — hoje!', priority: 2 };
  if (diffDays <= 3) return { emoji: '⚠️', color: '#F8A800', label: `${Math.ceil(diffDays)}d restantes`, priority: 3 };
  return { emoji: '🟠', color: '#e85219', label: `${Math.ceil(diffDays)}d restantes`, priority: 4 };
}

function statusLabel(status: string, source: 'briefing' | 'ops_job') {
  const MAP: Record<string, string> = {
    briefing: 'Briefing', iclips_in: 'Entrada', alinhamento: 'Alinhamento',
    copy_ia: 'Copy IA', aprovacao: 'Aprovação', producao: 'Produção',
    revisao: 'Revisão', iclips_out: 'Saída', done: 'Concluído',
    intake: 'Entrada', planned: 'Planejado', ready: 'Pronto',
    allocated: 'Alocado', in_progress: 'Em produção', in_review: 'Em revisão',
    awaiting_approval: 'Aguard. aprovação', approved: 'Aprovado',
    blocked: 'Bloqueado',
  };
  return MAP[status] ?? status;
}

// Get jobs without due_at
function hasNoDueDate(jobs: Job[]) {
  return jobs.filter(j => !j.due_at && j.status !== 'done');
}

export default function AgendaPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  );

  const { data, isLoading } = useSWR<{ jobs?: Job[] }>('/freelancers/portal/me/jobs', swrFetcher);
  const allJobs = data?.jobs ?? [];

  // Group jobs by date key YYYY-MM-DD
  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of allJobs) {
      if (!job.due_at) continue;
      const key = job.due_at.slice(0, 10);
      (map[key] ??= []).push(job);
    }
    return map;
  }, [allJobs]);

  // Build calendar cells for current view month
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [
      ...Array<null>(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(key);
  }

  function dateKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isToday(day: number) {
    return dateKey(day) === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  // Jobs for selected date
  const selectedJobs = selectedDate ? (jobsByDate[selectedDate] ?? []) : [];
  const noDueDateJobs = hasNoDueDate(allJobs);

  // Summary counts
  const nowTs = today.getTime();
  const overdueCount = allJobs.filter(j => j.due_at && new Date(j.due_at) < today && !['done', 'published'].includes(j.status)).length;
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayCount = (jobsByDate[todayKey] ?? []).filter(j => !['done', 'published'].includes(j.status)).length;
  const doneCount = allJobs.filter(j => ['done', 'published'].includes(j.status)).length;

  return (
    <div className="portal-page">
      {/* Page header */}
      <div>
        <span className="portal-kicker">Planejamento</span>
        <h2 className="portal-page-title">📅 Agenda de Jobs</h2>
        <p className="portal-page-subtitle">
          Todos os seus prazos no calendário. Clique em um dia para ver os detalhes.
        </p>
      </div>

      {/* Summary pills */}
      {!isLoading && allJobs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {overdueCount > 0 && (
            <div style={{
              background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)',
              borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 22 }}>🔴</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4444', lineHeight: 1 }}>{overdueCount}</div>
                <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 2 }}>Atrasados</div>
              </div>
            </div>
          )}
          {todayCount > 0 && (
            <div style={{
              background: 'rgba(232,82,25,0.12)', border: '1px solid rgba(232,82,25,0.3)',
              borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 22 }}>🚨</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--portal-accent)', lineHeight: 1 }}>{todayCount}</div>
                <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 2 }}>Vencem hoje</div>
              </div>
            </div>
          )}
          <div style={{
            background: 'rgba(19,222,185,0.10)', border: '1px solid rgba(19,222,185,0.25)',
            borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#13DEB9', lineHeight: 1 }}>{doneCount}</div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 2 }}>Concluídos</div>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid var(--portal-border)',
            borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--portal-text)', lineHeight: 1 }}>{allJobs.length}</div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 2 }}>Total de jobs</div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar + detail layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: 16, alignItems: 'start' }}
          className="agenda-grid">

          {/* ── Calendar ────────────────────────────────────────── */}
          <section className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Month nav */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--portal-border)',
            }}>
              <button
                onClick={prevMonth}
                style={{
                  background: 'var(--portal-surface)', border: '1px solid var(--portal-border)',
                  borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
                  color: 'var(--portal-text)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--portal-text)' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </div>
                <button
                  onClick={goToday}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--portal-accent)', fontSize: 11, marginTop: 2,
                  }}
                >
                  Hoje
                </button>
              </div>

              <button
                onClick={nextMonth}
                style={{
                  background: 'var(--portal-surface)', border: '1px solid var(--portal-border)',
                  borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
                  color: 'var(--portal-text)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            </div>

            {/* Weekday headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
              padding: '8px 4px 4px', gap: 2,
            }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: 10, fontWeight: 700,
                  color: 'var(--portal-muted)', letterSpacing: '0.05em', padding: '4px 0',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            {isLoading ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--portal-muted)' }}>
                Carregando agenda...
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                padding: '4px', gap: 2,
              }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const key = dateKey(day);
                  const dayJobs = jobsByDate[key] ?? [];
                  const isSelected = selectedDate === key;
                  const todayDay = isToday(day);
                  // Compute highest urgency dot for this day
                  const dots = dayJobs.map(j => jobUrgency(j, today));
                  const topDot = dots.sort((a, b) => a.priority - b.priority)[0];

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(isSelected ? null : key)}
                      style={{
                        background: isSelected
                          ? 'rgba(232,82,25,0.18)'
                          : todayDay
                            ? 'rgba(93,135,255,0.12)'
                            : 'transparent',
                        border: isSelected
                          ? '2px solid var(--portal-accent)'
                          : todayDay
                            ? '2px solid rgba(93,135,255,0.5)'
                            : '2px solid transparent',
                        borderRadius: 10,
                        padding: '6px 4px',
                        cursor: 'pointer',
                        minHeight: 52,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        fontSize: 13,
                        fontWeight: todayDay ? 800 : 500,
                        color: todayDay ? '#5D87FF' : isSelected ? 'var(--portal-accent)' : 'var(--portal-text)',
                      }}>
                        {day}
                      </span>

                      {/* Job dots */}
                      {dayJobs.length > 0 && topDot && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 14 }}>{topDot.emoji}</span>
                          {dayJobs.length > 1 && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: topDot.color,
                              background: `${topDot.color}20`, borderRadius: 4, padding: '1px 4px',
                            }}>
                              +{dayJobs.length}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div style={{
              display: 'flex', gap: 12, flexWrap: 'wrap',
              padding: '12px 20px', borderTop: '1px solid var(--portal-border)',
            }}>
              {[
                { emoji: '🔴', label: 'Atrasado' },
                { emoji: '🚨', label: 'Hoje' },
                { emoji: '⚠️', label: '≤3 dias' },
                { emoji: '🟠', label: 'Em andamento' },
                { emoji: '✅', label: 'Concluído' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13 }}>{l.emoji}</span>
                  <span style={{ fontSize: 10, color: 'var(--portal-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Day detail panel ────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedDate ? (
              <section className="portal-card">
                <div className="portal-section-head" style={{ marginBottom: 14 }}>
                  <h3 className="portal-section-title">
                    📌 {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h3>
                  {selectedJobs.length > 0 && (
                    <span className="portal-pill portal-pill-accent">{selectedJobs.length}</span>
                  )}
                </div>

                {selectedJobs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🗓️</div>
                    <p className="portal-card-subtitle">Nenhum job com prazo neste dia.</p>
                  </div>
                ) : (
                  <div className="portal-list">
                    {selectedJobs.map(job => {
                      const urg = jobUrgency(job, today);
                      return (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}?source=${job.source}`}
                          className="portal-list-card"
                          style={{ textDecoration: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{urg.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p className="portal-card-title" style={{ marginBottom: 2 }}>{job.title}</p>
                              <p className="portal-card-subtitle">
                                {job.client_name ?? '—'}
                              </p>
                              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, color: urg.color,
                                  background: `${urg.color}1a`, borderRadius: 6, padding: '2px 8px',
                                }}>
                                  {urg.label}
                                </span>
                                <span style={{
                                  fontSize: 10, color: 'var(--portal-muted)',
                                  background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px',
                                }}>
                                  {statusLabel(job.status, job.source)}
                                </span>
                              </div>
                            </div>
                            <span style={{ color: 'var(--portal-muted)', fontSize: 16, alignSelf: 'center' }}>›</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <section className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>👆</div>
                <p className="portal-card-title">Clique em um dia</p>
                <p className="portal-card-subtitle">Selecione uma data no calendário para ver os jobs com prazo naquele dia.</p>
              </section>
            )}

            {/* Jobs sem prazo */}
            {noDueDateJobs.length > 0 && (
              <section className="portal-card">
                <div className="portal-section-head" style={{ marginBottom: 12 }}>
                  <h3 className="portal-section-title">🕐 Sem prazo definido</h3>
                  <span className="portal-pill portal-pill-neutral">{noDueDateJobs.length}</span>
                </div>
                <div className="portal-list">
                  {noDueDateJobs.map(job => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}?source=${job.source}`}
                      className="portal-list-card"
                      style={{ textDecoration: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>📋</span>
                        <div style={{ flex: 1 }}>
                          <p className="portal-card-title">{job.title}</p>
                          <p className="portal-card-subtitle">{job.client_name ?? '—'}</p>
                        </div>
                        <span style={{ color: 'var(--portal-muted)', fontSize: 16 }}>›</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .agenda-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
