'use client';

import React from 'react';

interface PitchProblemaProps {
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

export const PitchProblema: React.FC<PitchProblemaProps> = ({
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
  const slideTitle = headline ?? title ?? 'O Problema';
  const companyName = brandName ?? name ?? 'Startup';
  const subHeadline = body ?? caption ?? description ?? text ?? 'Milhões de empresas ainda sofrem com processos ineficientes';

  const pains = [
    { pct: '73%', label: 'das empresas perdem tempo com tarefas manuais repetitivas', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v4l3 3' },
    { pct: 'R$2,4bi', label: 'desperdiçados anualmente em retrabalho e erros operacionais', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { pct: '4 em 5', label: 'gestores não têm visibilidade em tempo real sobre seus negócios', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
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
        @keyframes pitch-prob-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Left colored sidebar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px',
        background: `linear-gradient(180deg, ${accent}, ${accent}44)`,
      }} />

      {/* Top decorative band */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, ${accent}, transparent)`,
      }} />

      {/* Background pattern */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '220px', height: '315px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        clipPath: 'polygon(40px 0, 100% 0, 100% 100%, 0 100%)',
      }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: '22px 26px 18px 30px',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: accent,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px',
            }}>
              {companyName}
            </div>
            <h2 style={{
              fontSize: '22px', fontWeight: 900, color: '#0f172a',
              margin: 0, letterSpacing: '-0.02em',
            }}>
              {slideTitle}
            </h2>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '3px 0 0 0', fontWeight: 400 }}>
              {subHeadline}
            </p>
          </div>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Pain point cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, animation: 'pitch-prob-in 0.5s ease-out' }}>
          {pains.map((pain, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: `3px solid ${i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#eab308'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                minWidth: '56px',
                fontSize: i === 0 ? '20px' : '16px',
                fontWeight: 900,
                color: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#eab308',
                lineHeight: 1,
              }}>
                {pain.pct}
              </div>
              <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />
              <p style={{ margin: 0, fontSize: '11px', color: '#334155', lineHeight: 1.4, fontWeight: 500 }}>
                {pain.label}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Fonte: Pesquisa de Mercado 2025</span>
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>02 / 15</span>
        </div>
      </div>
    </div>
  );
};
