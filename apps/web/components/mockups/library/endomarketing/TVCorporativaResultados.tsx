'use client';

import React from 'react';

interface TVCorporativaResultadosProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaResultados: React.FC<TVCorporativaResultadosProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Resultados Anuais',
  headline = 'Comparativo por Trimestre · 2024',
  brandColor = '#2563eb',
  name = '',
}) => {
  const trimestres = [
    {
      label: 'Q1', periodo: 'Jan–Mar',
      metricas: [
        { nome: 'Receita', meta: 'R$ 1,2M', realizado: 'R$ 1,31M', pct: 109, hit: true },
        { nome: 'NPS', meta: '70', realizado: '74', pct: 106, hit: true },
        { nome: 'Churn', meta: '<5%', realizado: '6,2%', pct: 76, hit: false },
      ],
    },
    {
      label: 'Q2', periodo: 'Abr–Jun',
      metricas: [
        { nome: 'Receita', meta: 'R$ 1,4M', realizado: 'R$ 1,38M', pct: 98, hit: false },
        { nome: 'NPS', meta: '72', realizado: '79', pct: 110, hit: true },
        { nome: 'Churn', meta: '<5%', realizado: '4,1%', pct: 118, hit: true },
      ],
    },
    {
      label: 'Q3', periodo: 'Jul–Set',
      metricas: [
        { nome: 'Receita', meta: 'R$ 1,5M', realizado: 'R$ 1,62M', pct: 108, hit: true },
        { nome: 'NPS', meta: '72', realizado: '71', pct: 99, hit: false },
        { nome: 'Churn', meta: '<5%', realizado: '3,8%', pct: 124, hit: true },
      ],
    },
    {
      label: 'Q4', periodo: 'Out–Dez',
      metricas: [
        { nome: 'Receita', meta: 'R$ 1,8M', realizado: 'R$ 1,95M', pct: 108, hit: true },
        { nome: 'NPS', meta: '75', realizado: '82', pct: 109, hit: true },
        { nome: 'Churn', meta: '<4%', realizado: '3,2%', pct: 125, hit: true },
      ],
    },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #050a15 0%, #0d1a2e 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes res-col { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .res-col { animation: res-col 0.45s ease both; }
        .res-col:nth-child(1){animation-delay:0.05s}
        .res-col:nth-child(2){animation-delay:0.15s}
        .res-col:nth-child(3){animation-delay:0.25s}
        .res-col:nth-child(4){animation-delay:0.35s}
        @keyframes res-bar { from{height:0} to{height:var(--h)} }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #22c55e, #ef4444, #f59e0b)` }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 20px 7px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ cor: '#22c55e', label: 'Meta atingida' }, { cor: '#ef4444', label: 'Abaixo da meta' }].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.cor }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '10px 14px' }}>
        {trimestres.map((q, qi) => (
          <div key={qi} className="res-col" style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 9, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column',
          }}>
            {/* Q header */}
            <div style={{
              background: `${brandColor}22`, borderBottom: '1px solid rgba(255,255,255,0.07)',
              padding: '6px 10px',
            }}>
              <div style={{ color: brandColor, fontSize: 16, fontWeight: 900 }}>{q.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8 }}>{q.periodo}</div>
            </div>

            {/* Metrics */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {q.metricas.map((m, mi) => (
                <div key={mi} style={{
                  padding: '7px 10px',
                  borderBottom: mi < q.metricas.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: m.hit ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 8 }}>{m.nome}</span>
                    <span style={{ fontSize: 9 }}>{m.hit ? '✓' : '✗'}</span>
                  </div>
                  <div style={{ color: m.hit ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 800 }}>{m.realizado}</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 7 }}>Meta: {m.meta}</div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.min(m.pct, 100)}%`,
                      background: m.hit ? '#22c55e' : '#ef4444', borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Score */}
            <div style={{
              padding: '5px 10px', background: 'rgba(255,255,255,0.03)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'center',
            }}>
              <span style={{
                color: q.metricas.filter(m => m.hit).length === 3 ? '#4ade80' : '#f59e0b',
                fontSize: 10, fontWeight: 700,
              }}>
                {q.metricas.filter(m => m.hit).length}/3 metas
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Resultados Consolidados · Diretoria</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
