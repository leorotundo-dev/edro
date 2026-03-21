'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { swrFetcher } from '@/lib/api';

type ForecastRow = {
  category: string;
  job_size: string | null;
  count: string;
  total_fee_brl: string;
  total_points: string;
};

type Forecast = {
  forecast: ForecastRow[];
  summary: { total_jobs: number; total_fee_brl: number };
};

const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  design:     { emoji: '🎨', label: 'Design',      color: '#A78BFA' },
  video:      { emoji: '🎬', label: 'Vídeo',       color: '#FA896B' },
  copy:       { emoji: '✍️', label: 'Copy',        color: '#5D87FF' },
  management: { emoji: '📋', label: 'Gestão',      color: '#13DEB9' },
  outros:     { emoji: '◈',  label: 'Outros',      color: '#F8A800' },
};

const SIZE_COLOR: Record<string, string> = {
  PP: '#888', P: '#13DEB9', M: '#5D87FF', G: '#F8A800', GG: '#FA896B',
};

export default function RadarPage() {
  const { data, isLoading } = useSWR<Forecast>('/freelancers/portal/me/forecast', swrFetcher);

  const grouped = (data?.forecast ?? []).reduce<Record<string, ForecastRow[]>>((acc, row) => {
    const cat = row.category ?? 'outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  const hasData = data && data.summary.total_jobs > 0;

  return (
    <div className="portal-page">

      {/* Header */}
      <div>
        <span className="portal-kicker">Mercado · Próximas semanas</span>
        <h2 className="portal-page-title">🔮 Radar de Forecast</h2>
        <p className="portal-page-subtitle">
          Veja o que está sendo preparado antes de virar Card oficial.
          Organize sua agenda com antecedência.
        </p>
      </div>

      {isLoading ? (
        <div className="portal-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔮</div>
          <p className="portal-card-subtitle">Carregando radar…</p>
        </div>
      ) : !hasData ? (
        <section className="portal-card">
          <div className="portal-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🟢</div>
            <p className="portal-card-title">Radar limpo</p>
            <p className="portal-card-subtitle">
              Não há escopos planejados no momento. Fique de olho — aparecerão aqui antes de serem liberados no Mercado.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Summary banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(93,135,255,0.08) 100%)',
            border: '1.5px solid rgba(167,139,250,0.3)',
            borderRadius: 14, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 32 }}>🔮</span>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#A78BFA', lineHeight: 1 }}>
                {data.summary.total_jobs} escopos
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--portal-muted)' }}>
                ≈ R$ {data.summary.total_fee_brl.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} em honorários planejados
              </p>
            </div>
          </div>

          {/* By category */}
          {Object.entries(grouped).map(([cat, rows]) => {
            const meta = CATEGORY_META[cat] ?? CATEGORY_META.outros;
            const catTotal = rows.reduce((s, r) => s + parseInt(r.count), 0);
            const catFee   = rows.reduce((s, r) => s + parseFloat(r.total_fee_brl), 0);

            return (
              <section key={cat} style={{
                background: `${meta.color}08`,
                border: `1.5px solid ${meta.color}25`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                {/* Category header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '13px 16px', borderBottom: `1px solid ${meta.color}20`,
                }}>
                  <span style={{ fontSize: 18 }}>{meta.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: meta.color }}>{meta.label}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                    background: `${meta.color}22`, color: meta.color,
                  }}>{catTotal}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--portal-muted)', fontWeight: 600 }}>
                    ≈ R$ {catFee.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Size breakdown */}
                <div style={{ padding: '10px 16px 14px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {rows.map(row => {
                      const sc = SIZE_COLOR[row.job_size ?? ''] ?? '#888';
                      return (
                        <div key={`${cat}-${row.job_size}`} style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          background: `${sc}10`, border: `1px solid ${sc}25`,
                          borderRadius: 10, padding: '8px 12px',
                        }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                            background: `${sc}20`, color: sc, letterSpacing: '0.04em',
                          }}>{row.job_size ?? '?'}</span>
                          <div>
                            <span style={{ fontSize: 18, fontWeight: 800, color: sc, lineHeight: 1 }}>
                              {row.count}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--portal-muted)', marginLeft: 5 }}>
                              escopo{parseInt(row.count) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div style={{ borderLeft: `1px solid ${sc}25`, paddingLeft: 10, marginLeft: 4 }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: sc }}>
                              R$ {parseFloat(row.total_fee_brl).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}

          <p style={{ fontSize: 11, color: 'var(--portal-muted)', textAlign: 'center' }}>
            Escopos ainda não liberados — quantidades e valores podem mudar até chegarem ao Mercado.
          </p>
        </>
      )}

      {/* Nav */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Link href="/jobs" style={{ fontSize: 12, color: 'var(--portal-accent)', textDecoration: 'none' }}>
          ◈ Ver Mercado de Escopos
        </Link>
        <span style={{ color: 'var(--portal-border)' }}>·</span>
        <Link href="/" style={{ fontSize: 12, color: 'var(--portal-accent)', textDecoration: 'none' }}>
          ← Workspace
        </Link>
      </div>

    </div>
  );
}
