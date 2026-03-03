'use client';

import React from 'react';

interface PitchFinanceiroProps {
  name?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
  themeColor?: string;
}

export const PitchFinanceiro: React.FC<PitchFinanceiroProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const slideTitle = headline ?? title ?? 'Projeções Financeiras';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Trajetória até o breakeven em 18 meses com crescimento acelerado';

  const rows = [
    { label: 'Receita Bruta',  y1: 'R$ 2,1M',  y2: 'R$ 7,8M',  y3: 'R$ 24M',   positive: true },
    { label: 'Receita Líquida', y1: 'R$ 1,8M', y2: 'R$ 6,6M',  y3: 'R$ 20,4M', positive: true },
    { label: 'Gross Profit',   y1: 'R$ 1,2M',  y2: 'R$ 4,8M',  y3: 'R$ 15,6M', positive: true },
    { label: 'EBITDA',         y1: '-R$ 1,4M', y2: 'R$ 0,6M',  y3: 'R$ 6,2M',  positive: false },
    { label: 'Margem EBITDA',  y1: '-67%',     y2: '8%',        y3: '26%',       positive: false },
  ];

  // Bar chart data (Receita em R$M)
  const bars = [
    { label: 'Ano 1', val: 2.1,  maxVal: 24 },
    { label: 'Ano 2', val: 7.8,  maxVal: 24 },
    { label: 'Ano 3', val: 24,   maxVal: 24 },
  ];

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-fin-bar {
          from { height: 0; }
          to { height: var(--bar-h); }
        }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', gap: '18px', padding: '20px 24px 16px 30px' }}>

        {/* Left: header + table */}
        <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
              {companyName}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '-0.02em' }}>
              {slideTitle}
            </h2>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{subText}</p>
          </div>

          {/* Table */}
          <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
              background: '#0f172a', padding: '6px 10px', gap: '4px',
            }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>Indicador</span>
              {['Ano 1', 'Ano 2', 'Ano 3'].map((y, i) => (
                <span key={i} style={{ fontSize: '9px', fontWeight: 700, color: i === 2 ? accent : '#94a3b8', textAlign: 'right' }}>{y}</span>
              ))}
            </div>
            {rows.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
                padding: '5px 10px', gap: '4px',
                background: i % 2 === 0 ? '#f8fafc' : '#ffffff',
                borderBottom: '1px solid #f1f5f9',
              }}>
                <span style={{ fontSize: '10px', color: '#334155', fontWeight: 600 }}>{r.label}</span>
                <span style={{ fontSize: '10px', color: r.y1.startsWith('-') ? '#ef4444' : '#16a34a', textAlign: 'right', fontWeight: 700 }}>{r.y1}</span>
                <span style={{ fontSize: '10px', color: r.y2.startsWith('-') ? '#ef4444' : '#16a34a', textAlign: 'right', fontWeight: 700 }}>{r.y2}</span>
                <span style={{ fontSize: '10px', color: '#0f172a', textAlign: 'right', fontWeight: 800 }}>{r.y3}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
            <span>* Projeções internas · sujeitas a revisão</span>
            <span>10 / 15</span>
          </div>
        </div>

        {/* Right: bar chart */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textAlign: 'center' }}>
            Receita Bruta Projetada (R$M)
          </div>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            gap: '14px', padding: '10px 10px 0',
            background: '#f8fafc', borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}>
            {bars.map((b, i) => {
              const h = Math.round((b.val / b.maxVal) * 120);
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: i === 2 ? accent : '#334155' }}>
                    R${b.val}M
                  </span>
                  <div style={{
                    width: '40px', height: `${h}px`,
                    background: i === 2 ? accent : i === 1 ? `${accent}88` : `${accent}44`,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.6s ease-out',
                  }} />
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>{b.label}</span>
                </div>
              );
            })}
          </div>

          {/* Breakeven badge */}
          <div style={{
            marginTop: '8px', textAlign: 'center',
            background: '#dcfce7', border: '1px solid #86efac',
            borderRadius: '7px', padding: '5px 10px',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a' }}>
              Breakeven previsto: Mês 18
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
