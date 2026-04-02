'use client';

/**
 * Scorecard do Fornecedor (B2B)
 * ─────────────────────────────
 * Shows SLA compliance, delivery rating, SLA violation history, and time entries.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';

type ScoreData = {
  score: {
    value: number;
    label: string;
    color: 'green' | 'blue' | 'yellow' | 'red';
    deliveries_total: number;
    deliveries_on_time: number;
    deliveries_late: number;
    updated_at: string | null;
  };
  violations: Array<{
    job_title: string;
    deadline_at: string;
    delivered_at: string | null;
    days_late: number;
    glosa_brl: string;
  }>;
  recent_deliveries: Array<{
    title: string;
    deadline_at: string | null;
    completed_at: string;
    days_late: number;
  }>;
};

const COLOR_MAP = {
  green:  { main: '#13DEB9', bg: 'rgba(19,222,185,0.10)',  border: 'rgba(19,222,185,0.3)' },
  blue:   { main: '#5D87FF', bg: 'rgba(93,135,255,0.10)',  border: 'rgba(93,135,255,0.3)' },
  yellow: { main: '#F8A800', bg: 'rgba(248,168,0,0.10)',   border: 'rgba(248,168,0,0.3)' },
  red:    { main: '#FA896B', bg: 'rgba(250,137,107,0.10)', border: 'rgba(250,137,107,0.3)' },
};

function ScoreRing({ value, color }: { value: number; color: keyof typeof COLOR_MAP }) {
  const c = COLOR_MAP[color];
  const r = 44;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  const dash = (pct / 100) * circ;

  return (
    <svg width={110} height={110} viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={c.main} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="55" y="51" textAnchor="middle" dominantBaseline="middle"
        fill={c.main} fontSize="22" fontWeight="800" fontFamily="inherit">
        {Math.round(pct)}
      </text>
      <text x="55" y="67" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="inherit">
        / 100
      </text>
    </svg>
  );
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

type TimeEntry = {
  id: string;
  started_at: string;
  ended_at: string;
  minutes: number;
  briefing_title: string | null;
};

function fmtMin(m: number) {
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h}h ${r}min` : `${h}h`;
}

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function shift(delta: number) {
    const [y, m] = value.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const label = new Date(`${value}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const isCurrentMonth = value === new Date().toISOString().slice(0, 7);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" onClick={() => shift(-1)} style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 7, padding: '4px 10px', color: 'var(--portal-text)', cursor: 'pointer', fontSize: 14,
      }}>‹</button>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--portal-text)', minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>{label}</span>
      <button type="button" onClick={() => shift(1)} disabled={isCurrentMonth} style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 7, padding: '4px 10px', color: isCurrentMonth ? 'rgba(255,255,255,0.2)' : 'var(--portal-text)',
        cursor: isCurrentMonth ? 'not-allowed' : 'pointer', fontSize: 14,
      }}>›</button>
    </div>
  );
}

export default function ScorePage() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const { data, isLoading } = useSWR<ScoreData>('/freelancers/portal/me/score', swrFetcher);
  const { data: entriesData } = useSWR<{ entries: TimeEntry[] }>(
    `/freelancers/portal/me/entries?month=${month}`,
    swrFetcher,
  );

  if (isLoading || !data) {
    return (
      <div className="portal-page">
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p className="portal-card-subtitle">Carregando scorecard...</p>
        </div>
      </div>
    );
  }

  const { score, violations, recent_deliveries } = data;
  const c = COLOR_MAP[score.color];
  const onTimeRate = score.deliveries_total > 0
    ? Math.round((score.deliveries_on_time / score.deliveries_total) * 100)
    : 100;

  return (
    <div className="portal-page">

      <div>
        <span className="portal-kicker">Desempenho</span>
        <h2 className="portal-page-title">★ Scorecard do Fornecedor</h2>
        <p className="portal-page-subtitle">
          Avaliação baseada no cumprimento de SLAs (prazos acordados). A plataforma não rastreia horas.
        </p>
      </div>

      {/* Main score card */}
      <section style={{
        background: c.bg, border: `2px solid ${c.border}`,
        borderRadius: 16, padding: '24px 22px',
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <ScoreRing value={score.value} color={score.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.main, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Score SLA
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
            {score.label}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {score.deliveries_total === 0
              ? 'Nenhuma entrega ainda. Score começa em 100.'
              : `${score.deliveries_on_time} de ${score.deliveries_total} entregas dentro do SLA (${onTimeRate}%)`}
          </p>
          {score.updated_at && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              Atualizado em {fmt(score.updated_at)}
            </p>
          )}
        </div>
      </section>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { value: score.deliveries_total, label: 'Total de entregas',  color: '#13DEB9', bg: 'rgba(19,222,185,0.08)',  border: 'rgba(19,222,185,0.2)' },
          { value: score.deliveries_on_time, label: 'No prazo (SLA OK)', color: '#5D87FF', bg: 'rgba(93,135,255,0.08)', border: 'rgba(93,135,255,0.2)' },
          { value: score.deliveries_late,  label: 'Com atraso',         color: '#FA896B', bg: 'rgba(250,137,107,0.08)', border: 'rgba(250,137,107,0.2)' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: '1 1 110px', background: stat.bg,
            border: `1px solid ${stat.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'var(--portal-muted)', marginTop: 3 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Score rules */}
      <section style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '16px 18px',
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--portal-text)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Como o score funciona
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            ['Score ≥ 90 — Prioridade máxima na oferta de escopos', '★★★★★', '#13DEB9'],
            ['Score 75–89 — Boa preferência de alocação',           '★★★★☆', '#5D87FF'],
            ['Score 60–74 — Alocação normal, monitorado',           '★★★☆☆', '#F8A800'],
            ['Score < 60 — Restrição de escopos até recuperação',   '★★☆☆☆', '#FA896B'],
          ].map(([text, stars, clr]) => (
            <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: clr, flexShrink: 0, minWidth: 72 }}>{stars}</span>
              <span style={{ fontSize: 12, color: 'var(--portal-muted)' }}>{text}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12, marginBottom: 0 }}>
          ℹ️ A plataforma não rastreia horas, localização nem uso de dispositivo — somente o cumprimento dos prazos (SLA) acordados no aceite de escopo.
        </p>
      </section>

      {/* SLA violations */}
      {violations.length > 0 && (
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 14, color: '#FA896B' }}>
            ⚠ Ocorrências de SLA (últimos 90 dias)
          </h3>
          <div className="portal-list">
            {violations.map((v, i) => (
              <div key={i} className="portal-list-card" style={{ borderLeft: '3px solid rgba(250,137,107,0.5)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="portal-card-title" style={{ marginBottom: 3 }}>{v.job_title}</p>
                  <p className="portal-card-subtitle">
                    SLA: {fmt(v.deadline_at)}
                    {v.delivered_at && ` · Entregue: ${fmt(v.delivered_at)}`}
                    {v.days_late > 0 && ` · ${v.days_late}d de atraso`}
                  </p>
                </div>
                {parseFloat(v.glosa_brl) > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 800, color: '#FA896B',
                    background: 'rgba(250,137,107,0.12)', borderRadius: 8, padding: '4px 10px', flexShrink: 0,
                  }}>
                    Glosa −R$ {parseFloat(v.glosa_brl).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent deliveries */}
      {recent_deliveries.length > 0 && (
        <section className="portal-card">
          <h3 className="portal-section-title" style={{ marginBottom: 14 }}>✅ Entregas recentes (30 dias)</h3>
          <div className="portal-list">
            {recent_deliveries.map((d, i) => (
              <div key={i} className="portal-list-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="portal-card-title" style={{ marginBottom: 3 }}>{d.title}</p>
                  <p className="portal-card-subtitle">
                    Entregue em {fmt(d.completed_at)}
                    {d.deadline_at && ` · SLA: ${fmt(d.deadline_at)}`}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  color: d.days_late > 0 ? '#FA896B' : '#13DEB9',
                  background: d.days_late > 0 ? 'rgba(250,137,107,0.10)' : 'rgba(19,222,185,0.08)',
                  borderRadius: 7, padding: '3px 9px',
                }}>
                  {d.days_late > 0 ? `+${d.days_late}d atraso` : '✓ SLA OK'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {score.deliveries_total === 0 && violations.length === 0 && (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <p className="portal-card-title">Score perfeito</p>
            <p className="portal-card-subtitle">
              Suas entregas futuras serão avaliadas com base nos SLAs do aceite de escopo.
            </p>
          </div>
        </section>
      )}

      {/* ── Time entries ───────────────────────────────────────── */}
      <section className="portal-card">
        <div className="portal-section-head" style={{ marginBottom: 14 }}>
          <h3 className="portal-section-title">⏱ Lançamentos de horas</h3>
          <MonthPicker value={month} onChange={setMonth} />
        </div>

        {(() => {
          const entries = entriesData?.entries ?? [];
          const totalMin = entries.reduce((s, e) => s + e.minutes, 0);

          if (!entriesData) {
            return <p style={{ fontSize: 13, color: 'var(--portal-muted)' }}>Carregando...</p>;
          }

          if (entries.length === 0) {
            return (
              <div className="portal-empty" style={{ padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <p className="portal-card-subtitle">Nenhum lançamento neste mês.</p>
              </div>
            );
          }

          return (
            <>
              <div style={{
                display: 'flex', gap: 10, marginBottom: 14, padding: '12px 14px',
                background: 'rgba(93,135,255,0.08)', border: '1px solid rgba(93,135,255,0.2)',
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 22 }}>⏱</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#5D87FF' }}>{fmtMin(totalMin)}</div>
                  <div style={{ fontSize: 11, color: 'var(--portal-muted)' }}>Total no mês · {entries.length} lançamento{entries.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="portal-list">
                {entries.map(e => {
                  const start = new Date(e.started_at);
                  const end = new Date(e.ended_at);
                  return (
                    <div key={e.id} className="portal-list-card">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="portal-card-title" style={{ marginBottom: 3 }}>
                          {e.briefing_title ?? 'Job sem título'}
                        </p>
                        <p className="portal-card-subtitle">
                          {start.toLocaleDateString('pt-BR')} · {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} → {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 800, color: '#5D87FF',
                        background: 'rgba(93,135,255,0.1)', borderRadius: 7, padding: '3px 9px', flexShrink: 0,
                      }}>
                        {fmtMin(e.minutes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </section>

    </div>
  );
}
