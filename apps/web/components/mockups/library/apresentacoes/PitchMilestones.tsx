'use client';

import React from 'react';

interface PitchMilestonesProps {
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

export const PitchMilestones: React.FC<PitchMilestonesProps> = ({
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
  const slideTitle = headline ?? title ?? 'Marcos Alcançados';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'De ideia a produto com tração real em 24 meses';

  const milestones = [
    { date: 'Jan 2024', label: 'Fundação',         desc: 'Empresa constituída, primeiros R$500k de investimento anjo', done: true  },
    { date: 'Abr 2024', label: 'MVP Lançado',       desc: 'Versão beta com 50 clientes piloto e NPS 68', done: true  },
    { date: 'Jul 2024', label: 'Product-Market Fit', desc: 'Taxa de retenção 85% e primeiras renovações', done: true  },
    { date: 'Out 2024', label: 'R$ 100k MRR',        desc: 'Marco de receita atingido com 400 clientes', done: true  },
    { date: 'Jan 2025', label: 'Seed Round',         desc: 'R$3M captados com fundo XP Ventures', done: true  },
    { date: 'Ago 2025', label: 'R$ 480k MRR',        desc: 'Crescimento 28% MoM — marco atual', done: true, current: true },
    { date: 'Mar 2026', label: 'Série A',            desc: 'Captação em andamento — R$8M', done: false },
    { date: 'Dez 2026', label: 'Expansão LATAM',    desc: 'México e Colômbia como novos mercados', done: false },
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
        @keyframes pitch-ms-pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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

        {/* Timeline track */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {/* Horizontal line */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: '2px', background: '#e2e8f0', transform: 'translateY(-50%)',
          }} />
          {/* Completed portion */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, width: '75%',
            height: '2px', background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
            transform: 'translateY(-50%)',
          }} />

          {/* Milestone dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {milestones.map((m, i) => {
              const isTop = i % 2 === 0;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '56px' }}>
                  {/* Top label */}
                  {isTop && (
                    <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                      <div style={{
                        fontSize: '8px', fontWeight: 700,
                        color: m.current ? accent : m.done ? '#334155' : '#94a3b8',
                        lineHeight: 1.2, marginBottom: '2px',
                      }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '7px', color: '#94a3b8', lineHeight: 1.2 }}>{m.date}</div>
                    </div>
                  )}
                  {!isTop && <div style={{ height: '38px' }} />}

                  {/* Dot */}
                  <div style={{
                    width: m.current ? '16px' : '12px',
                    height: m.current ? '16px' : '12px',
                    borderRadius: '50%',
                    background: m.current ? accent : m.done ? accent : '#e2e8f0',
                    border: m.current ? `3px solid ${accent}` : m.done ? `2px solid ${accent}` : '2px solid #cbd5e1',
                    boxShadow: m.current ? `0 0 0 4px ${accent}33` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: `pitch-ms-pop 0.3s ease-out ${i * 0.07}s both`,
                    zIndex: 1, position: 'relative',
                    flexShrink: 0,
                  }}>
                    {m.done && !m.current && (
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  {/* Bottom label */}
                  {!isTop && (
                    <div style={{ marginTop: '6px', textAlign: 'center' }}>
                      <div style={{
                        fontSize: '8px', fontWeight: 700,
                        color: m.current ? accent : m.done ? '#334155' : '#94a3b8',
                        lineHeight: 1.2, marginBottom: '2px',
                      }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '7px', color: '#94a3b8', lineHeight: 1.2 }}>{m.date}</div>
                    </div>
                  )}
                  {isTop && <div style={{ height: '38px' }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent }} />
              <span>Concluído</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0', border: '1px solid #cbd5e1' }} />
              <span>Planejado</span>
            </div>
          </div>
          <span>12 / 15</span>
        </div>
      </div>
    </div>
  );
};
