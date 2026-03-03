'use client';

import React from 'react';

interface InfograficoTimelineProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  brandName?: string;
  brandColor?: string;
}

export const InfograficoTimeline: React.FC<InfograficoTimelineProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#ec4899',
}) => {
  const resolvedTitle = headline || title || name || 'Nossa Jornada de Crescimento';
  const resolvedSubtitle =
    body || text || description || caption || 'Os marcos mais importantes da nossa trajetória desde a fundação.';
  const resolvedBrand = brandName || '';
  const accent = brandColor || '#ec4899';

  const milestones = [
    {
      date: 'Jan 2021',
      title: 'Fundação',
      desc: 'Empresa criada com 3 sócios e uma visão clara de transformar o mercado.',
      icon: '🚀',
    },
    {
      date: 'Jun 2021',
      title: 'Primeiro Cliente',
      desc: 'Fechamos nosso primeiro contrato enterprise com R$ 50k ARR.',
      icon: '🤝',
    },
    {
      date: 'Mar 2022',
      title: 'Série Seed',
      desc: 'Captamos R$ 2M de investimento para acelerar o crescimento.',
      icon: '💰',
    },
    {
      date: 'Set 2023',
      title: '100 Clientes',
      desc: 'Atingimos a marca de 100 clientes ativos em 8 estados brasileiros.',
      icon: '🏆',
    },
    {
      date: 'Mar 2026',
      title: 'Expansão LAT',
      desc: 'Abertura de operações no México e Argentina — mercado de 600M pessoas.',
      icon: '🌎',
    },
  ];

  return (
    <div
      style={{
        width: '380px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes itl-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .itl-card { animation: itl-fade 0.4s ease; }
        .itl-item:hover .itl-dot { transform: scale(1.25); box-shadow: 0 0 0 4px rgba(0,0,0,0.08); }
        .itl-dot { transition: transform 0.2s, box-shadow 0.2s; }
      `}</style>

      <div className="itl-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 22px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · Timeline
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Timeline */}
        <div style={{ padding: '20px 22px 8px', position: 'relative' }}>
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: '38px',
              top: '28px',
              bottom: '16px',
              width: '2px',
              background: `linear-gradient(180deg, ${accent} 0%, ${accent}33 100%)`,
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {milestones.map((m, i) => (
              <div
                key={i}
                className="itl-item"
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  paddingBottom: i < milestones.length - 1 ? '18px' : '0',
                  position: 'relative',
                }}
              >
                {/* Dot */}
                <div
                  className="itl-dot"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: i === milestones.length - 1
                      ? `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`
                      : '#fff',
                    border: `2px solid ${accent}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {m.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: accent,
                        background: `${accent}15`,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {m.date}
                    </span>
                    {i === milestones.length - 1 && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#fff',
                          background: accent,
                          padding: '2px 6px',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Atual
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#4b5563', lineHeight: 1.5 }}>
                    {m.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {resolvedBrand && (
          <div style={{ padding: '10px 22px 14px', borderTop: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '10px', color: '#9ca3af' }}>{resolvedBrand}</span>
          </div>
        )}
        {!resolvedBrand && <div style={{ height: '14px' }} />}
      </div>
    </div>
  );
};
