'use client';

import React from 'react';

interface TVCorporativaMetasProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaMetas: React.FC<TVCorporativaMetasProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Metas do Trimestre',
  headline = 'Q1 · 2025',
  brandColor = '#10b981',
  name = '',
}) => {
  const metas = [
    { equipe: 'Vendas', meta: 'R$ 1,5M', atual: 'R$ 1,09M', pct: 73, cor: '#10b981', icon: '📈' },
    { equipe: 'Suporte', meta: '95% CSAT', atual: '91% CSAT', pct: 96, cor: '#3b82f6', icon: '🎯' },
    { equipe: 'Marketing', meta: '10k Leads', atual: '6.200 Leads', pct: 62, cor: '#f59e0b', icon: '📣' },
  ];

  const getColor = (pct: number) => pct >= 90 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #030d08 0%, #071a0f 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes meta-bar { from{width:0} to{width:var(--w)} }
        .meta-bar { animation: meta-bar 1.2s cubic-bezier(.4,0,.2,1) both; }
        .meta-bar:nth-child(1){animation-delay:0.2s}
        .meta-bar:nth-child(2){animation-delay:0.4s}
        .meta-bar:nth-child(3){animation-delay:0.6s}
        @keyframes meta-card { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .meta-card { animation: meta-card 0.5s ease both; }
        .meta-card:nth-child(1){animation-delay:0.1s}
        .meta-card:nth-child(2){animation-delay:0.25s}
        .meta-card:nth-child(3){animation-delay:0.4s}
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #3b82f6, #f59e0b)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 8px', borderBottom: '1px solid rgba(16,185,129,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${brandColor}25`, border: `1px solid ${brandColor}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 20, padding: '4px 14px',
        }}>
          <span style={{ color: '#34d399', fontSize: 11, fontWeight: 700 }}>Andamento</span>
        </div>
      </div>

      {/* Goal cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 20px' }}>
        {metas.map((m, i) => (
          <div key={i} className="meta-card" style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 16px',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{m.equipe}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>
                    Atual: {m.atual} · Meta: {m.meta}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: getColor(m.pct), fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{m.pct}%</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>atingido</div>
              </div>
            </div>

            {/* Bar */}
            <div style={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${m.pct}%`, borderRadius: 6,
                background: `linear-gradient(90deg, ${m.cor}, ${getColor(m.pct)})`,
                transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
              }} />
              {/* Target line at 100% — not needed visually, bar fills to pct */}
            </div>

            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Falta', val: `${100 - m.pct}%`, color: '#ef4444' },
                { label: 'Dias restantes', val: '28', color: 'rgba(255,255,255,0.4)' },
                { label: 'Status', val: m.pct >= 80 ? 'No prazo' : m.pct >= 60 ? 'Atenção' : 'Crítico', color: getColor(m.pct) },
              ].map((s, j) => (
                <div key={j} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8 }}>{s.label}:</span>
                  <span style={{ color: s.color, fontSize: 9, fontWeight: 600 }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Painel de Metas Corporativas</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
