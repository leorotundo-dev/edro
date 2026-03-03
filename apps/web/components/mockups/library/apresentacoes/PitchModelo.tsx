'use client';

import React from 'react';

interface PitchModeloProps {
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

export const PitchModelo: React.FC<PitchModeloProps> = ({
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
  const slideTitle = headline ?? title ?? 'Modelo de Negócio';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Receitas recorrentes e escaláveis com margens saudáveis';

  const streams = [
    {
      label: 'Assinatura',
      sublabel: 'SaaS recorrente',
      pct: '65%',
      color: accent,
      metrics: [{ k: 'Ticket médio', v: 'R$ 890/mês' }, { k: 'Churn', v: '< 3%' }],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: 'Transacional',
      sublabel: 'Pay-per-use',
      pct: '22%',
      color: '#8b5cf6',
      metrics: [{ k: 'Take rate', v: '2,5%' }, { k: 'Volume mensal', v: 'R$ 4,2M' }],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Premium',
      sublabel: 'Enterprise & APIs',
      pct: '13%',
      color: '#f59e0b',
      metrics: [{ k: 'ACV médio', v: 'R$ 48k/ano' }, { k: 'Contratos', v: '12 meses+' }],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  const unitEcon = [
    { k: 'LTV', v: 'R$ 32k' },
    { k: 'CAC', v: 'R$ 1,8k' },
    { k: 'LTV/CAC', v: '17,8x' },
    { k: 'Payback', v: '4 meses' },
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
        @keyframes pitch-mod-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 26px 16px 30px' }}>

        {/* Header */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
            {companyName}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 3px 0', letterSpacing: '-0.02em' }}>
            {slideTitle}
          </h2>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{subText}</p>
        </div>

        {/* Revenue stream cards */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', animation: 'pitch-mod-in 0.5s ease-out' }}>
          {streams.map((s, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '10px', padding: '12px',
              background: '#f8fafc', border: `1.5px solid ${s.color}33`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: s.color, borderRadius: '10px 10px 0 0',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div style={{
                  fontSize: '18px', fontWeight: 900, color: s.color, lineHeight: 1,
                }}>{s.pct}</div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '8px' }}>{s.sublabel}</div>
              {s.metrics.map((m, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                  <span style={{ fontSize: '9px', color: '#94a3b8' }}>{m.k}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#334155' }}>{m.v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Unit economics strip */}
        <div style={{
          display: 'flex', gap: '8px',
          background: '#0f172a', borderRadius: '8px',
          padding: '8px 14px',
        }}>
          {unitEcon.map((u, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              borderRight: i < unitEcon.length - 1 ? '1px solid #334155' : 'none',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 900, color: i === 2 ? '#4ade80' : '#f8fafc' }}>{u.v}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>{u.k}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Confidencial</span>
          <span>06 / 15</span>
        </div>
      </div>
    </div>
  );
};
