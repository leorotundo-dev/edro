'use client';

import React from 'react';

interface PitchInvestimentoProps {
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

export const PitchInvestimento: React.FC<PitchInvestimentoProps> = ({
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
  const slideTitle = headline ?? title ?? 'A Oportunidade';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Captação Série A para acelerar crescimento e expansão regional';

  const useOfFunds = [
    { label: 'Produto & Eng.',    pct: 40, color: accent },
    { label: 'Vendas & Mktg.',    pct: 30, color: '#8b5cf6' },
    { label: 'Operações & CS',    pct: 20, color: '#22c55e' },
    { label: 'Reserva Estratégica', pct: 10, color: '#f59e0b' },
  ];

  const milestones = [
    { label: 'R$ 2M MRR',         timeline: '6 meses' },
    { label: 'Expansão LATAM',    timeline: '9 meses' },
    { label: 'Series B ready',    timeline: '18 meses' },
    { label: '50k usuários ativos', timeline: '12 meses' },
  ];

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#0f172a',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-inv-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Background radial */}
      <div style={{
        position: 'absolute', top: '-60px', left: '-60px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
        animation: 'pitch-inv-glow 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-40px', right: '-40px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: `radial-gradient(circle, #8b5cf622 0%, transparent 70%)`,
      }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '22px 28px 18px 28px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: `${accent}99`, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            {companyName} · {slideTitle}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Captando <span style={{ color: accent }}>R$ 8 milhões</span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>{subText}</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          {/* Use of funds */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Uso dos Recursos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {useOfFunds.map((u, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 600 }}>{u.label}</span>
                    <span style={{ fontSize: '10px', color: u.color, fontWeight: 800 }}>{u.pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${u.pct}%`,
                      background: u.color, borderRadius: '3px',
                      transition: 'width 0.8s ease-out',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: '1px', background: '#1e293b' }} />

          {/* Milestones unlocked */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Marcos Desbloqueados
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {milestones.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: '#1e293b', borderRadius: '7px', padding: '6px 10px',
                  border: `1px solid ${accent}22`,
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: `${accent}22`, border: `1.5px solid ${accent}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600, flex: 1 }}>{m.label}</span>
                  <span style={{ fontSize: '9px', color: '#475569', whiteSpace: 'nowrap' }}>{m.timeline}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', color: '#334155' }}>
          <span>Confidencial · {companyName}</span>
          <span>11 / 15</span>
        </div>
      </div>
    </div>
  );
};
