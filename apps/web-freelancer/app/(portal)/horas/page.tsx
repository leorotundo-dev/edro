'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Entry = {
  id: string;
  briefing_id: string;
  briefing_title: string | null;
  started_at: string;
  ended_at: string;
  minutes: number;
  description: string | null;
};

function buildMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
    });
  }
  return options;
}

function fmtM(m: number) {
  if (!m) return '0h';
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

// Group entries by briefing title
function groupByBriefing(entries: Entry[]): Map<string, { title: string; minutes: number; count: number }> {
  const map = new Map<string, { title: string; minutes: number; count: number }>();
  for (const e of entries) {
    const key = e.briefing_id;
    const existing = map.get(key);
    if (existing) {
      existing.minutes += e.minutes;
      existing.count++;
    } else {
      map.set(key, { title: e.briefing_title ?? 'Job', minutes: e.minutes, count: 1 });
    }
  }
  return map;
}

export default function HorasPage() {
  const monthOptions = buildMonthOptions();
  const [month, setMonth] = useState(monthOptions[0].value);

  const { data, isLoading } = useSWR<{ entries: Entry[] }>(`/freelancers/portal/me/entries?month=${month}`, swrFetcher);
  const entries = data?.entries ?? [];
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes ?? 0), 0);
  const grouped = groupByBriefing(entries);
  const topJob = [...grouped.values()].sort((a, b) => b.minutes - a.minutes)[0];

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Tempo</span>
          <h2 className="portal-page-title">◷ Registro de horas</h2>
          <p className="portal-page-subtitle">Blocos de trabalho registrados no período selecionado.</p>
        </div>
        <div style={{ minWidth: 200 }}>
          <label className="portal-field-label" htmlFor="hours-month">Período</label>
          <select id="hours-month" value={month} onChange={(e) => setMonth(e.target.value)} className="portal-select">
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      {totalMinutes > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            flex: '1 1 140px', background: 'rgba(93,135,255,0.10)',
            border: '1px solid rgba(93,135,255,0.25)', borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>⏱</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#5D87FF' }}>{fmtM(totalMinutes)}</div>
            <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Total no período</div>
          </div>
          <div style={{
            flex: '1 1 140px', background: 'rgba(232,82,25,0.08)',
            border: '1px solid rgba(232,82,25,0.2)', borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--portal-accent)' }}>{entries.length}</div>
            <div style={{ fontSize: 11, color: 'var(--portal-muted)', marginTop: 4 }}>Blocos registrados</div>
          </div>
          {topJob && (
            <div style={{
              flex: '2 1 200px', background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: '16px 18px',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#A855F7', marginBottom: 2 }}>{topJob.title}</div>
              <div style={{ fontSize: 11, color: 'var(--portal-muted)' }}>Job com mais horas — {fmtM(topJob.minutes)}</div>
            </div>
          )}
        </div>
      )}

      {/* Per-briefing bars */}
      {grouped.size > 0 && (
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 14 }}>📊 Por job</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...grouped.values()]
              .sort((a, b) => b.minutes - a.minutes)
              .map((g) => {
                const pct = totalMinutes > 0 ? Math.round((g.minutes / totalMinutes) * 100) : 0;
                return (
                  <div key={g.title}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--portal-text)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{g.title}</span>
                      <span style={{ fontSize: 12, color: '#5D87FF', fontWeight: 700, flexShrink: 0 }}>{fmtM(g.minutes)}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99, width: `${pct}%`,
                        background: 'linear-gradient(90deg, #5D87FF, #A855F7)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 2 }}>{pct}% do total</div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Detail log */}
      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 14 }}>🕐 Detalhamento</h3>
        {isLoading ? (
          <div className="portal-empty">
            <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
            <p className="portal-card-subtitle">Carregando apontamentos...</p>
          </div>
        ) : !entries.length ? (
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗓️</div>
            <p className="portal-card-title">Nenhuma hora registrada</p>
            <p className="portal-card-subtitle">Não há apontamentos para {month}.</p>
          </div>
        ) : (
          <div className="portal-list">
            {entries.map((entry) => (
              <div key={entry.id} className="portal-list-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>🔵</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="portal-card-title">{entry.briefing_title ?? 'Job'}</p>
                    {entry.description && (
                      <p className="portal-card-subtitle">{entry.description}</p>
                    )}
                    <p className="portal-card-subtitle">
                      {new Date(entry.started_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {' → '}
                      {new Date(entry.ended_at).toLocaleString('pt-BR', { timeStyle: 'short' })}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: '#5D87FF',
                    background: 'rgba(93,135,255,0.12)', borderRadius: 8, padding: '5px 10px', flexShrink: 0,
                  }}>
                    {fmtM(entry.minutes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
