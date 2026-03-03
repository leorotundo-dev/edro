'use client';

import React from 'react';

interface PitchMercadoProps {
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

export const PitchMercado: React.FC<PitchMercadoProps> = ({
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
  const slideTitle = headline ?? title ?? 'Tamanho de Mercado';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Oportunidade total endereçável no Brasil e LATAM';

  const circles = [
    { label: 'TAM', sublabel: 'Mercado Total', value: 'R$ 48bi', color: `${accent}22`, border: `${accent}66`, textColor: '#0f172a', size: 180 },
    { label: 'SAM', sublabel: 'Mercado Endereçável', value: 'R$ 12bi', color: `${accent}33`, border: accent, textColor: '#0f172a', size: 130 },
    { label: 'SOM', sublabel: 'Mercado Obtível', value: 'R$ 2,4bi', color: accent, border: accent, textColor: '#ffffff', size: 84 },
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
        @keyframes pitch-mkt-grow {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)`,
      }} />
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: `linear-gradient(180deg, ${accent}, transparent)`,
      }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', gap: '24px',
        padding: '22px 28px 18px 30px',
      }}>

        {/* Left: header + legend */}
        <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {companyName}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 5px 0', letterSpacing: '-0.02em' }}>
              {slideTitle}
            </h2>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{subText}</p>
          </div>

          {/* Legend cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {circles.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: '#f8fafc', borderRadius: '8px',
                border: '1px solid #e2e8f0', padding: '8px 10px',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: i === 2 ? accent : i === 1 ? `${accent}44` : `${accent}18`,
                  border: `2px solid ${accent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 800,
                  color: i === 2 ? '#fff' : accent,
                }}>
                  {c.label}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{c.value}</div>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>{c.sublabel}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
            <span>Fonte: IBGE/Abranet 2025</span>
            <span>04 / 15</span>
          </div>
        </div>

        {/* Right: concentric circles */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {/* Outer glow */}
          <div style={{
            position: 'absolute', width: '200px', height: '200px', borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`,
          }} />

          {/* TAM — outermost */}
          <div style={{
            position: 'absolute', width: '180px', height: '180px', borderRadius: '50%',
            background: `${accent}10`, border: `2px dashed ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pitch-mkt-grow 0.6s ease-out',
          }}>
            {/* TAM label outside */}
          </div>
          {/* SAM */}
          <div style={{
            position: 'absolute', width: '124px', height: '124px', borderRadius: '50%',
            background: `${accent}20`, border: `2px solid ${accent}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pitch-mkt-grow 0.7s ease-out',
          }} />
          {/* SOM — innermost */}
          <div style={{
            position: 'absolute', width: '72px', height: '72px', borderRadius: '50%',
            background: accent, border: `3px solid ${accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${accent}55`,
            animation: 'pitch-mkt-grow 0.8s ease-out',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '8px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>SOM</div>
              <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.8)', marginTop: '1px' }}>R$2,4bi</div>
            </div>
          </div>

          {/* TAM label */}
          <div style={{ position: 'absolute', top: '8px', right: '30px', textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>TAM</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>R$ 48bi</div>
          </div>
          {/* SAM label */}
          <div style={{ position: 'absolute', top: '48px', right: '16px', textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, color: accent }}>SAM</div>
            <div style={{ fontSize: '8px', color: '#64748b' }}>R$ 12bi</div>
          </div>

          {/* Growth badge */}
          <div style={{
            position: 'absolute', bottom: '10px', left: '50%',
            transform: 'translateX(-50%)',
            background: '#dcfce7', border: '1px solid #86efac',
            borderRadius: '20px', padding: '3px 10px',
            fontSize: '10px', fontWeight: 700, color: '#16a34a',
            whiteSpace: 'nowrap',
          }}>
            CAGR 28% ao ano
          </div>
        </div>
      </div>
    </div>
  );
};
