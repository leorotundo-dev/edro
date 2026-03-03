'use client';

import React from 'react';

interface PitchCompetidoresProps {
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

export const PitchCompetidores: React.FC<PitchCompetidoresProps> = ({
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
  const slideTitle = headline ?? title ?? 'Panorama Competitivo';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Posicionamento único no quadrante de maior valor';

  // Competitors: { label, x: 0-100 (Preço: baixo→alto), y: 0-100 (Qualidade: baixo→alto), highlight }
  const dots = [
    { label: 'Legado A', x: 20, y: 55, highlight: false },
    { label: 'Legado B', x: 28, y: 42, highlight: false },
    { label: 'Rival X',  x: 62, y: 60, highlight: false },
    { label: 'Rival Y',  x: 55, y: 72, highlight: false },
    { label: companyName, x: 72, y: 85, highlight: true  },
  ];

  // quadrant area is 220×180 inside the chart box
  const chartW = 220;
  const chartH = 180;

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-comp-pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', gap: '20px', padding: '20px 26px 16px 30px' }}>

        {/* Left: header + legend */}
        <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
              {companyName}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              {slideTitle}
            </h2>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{subText}</p>
          </div>

          {/* Quadrant labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
            {[
              { bg: '#f0fdf4', border: '#86efac', color: '#16a34a', label: 'Alto Valor', desc: 'Alta qualidade · Preço justo' },
              { bg: '#fef9c3', border: '#fde047', color: '#ca8a04', label: 'Premium', desc: 'Alta qualidade · Preço alto' },
              { bg: '#f1f5f9', border: '#cbd5e1', color: '#64748b', label: 'Básico', desc: 'Baixa qualidade · Preço baixo' },
              { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', label: 'Armadilha', desc: 'Baixa qualidade · Preço alto' },
            ].map((q, i) => (
              <div key={i} style={{
                background: q.bg, border: `1px solid ${q.border}`,
                borderRadius: '6px', padding: '5px 8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: q.color }}>{q.label}</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>{q.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
            <span>Q1 2026</span><span>08 / 15</span>
          </div>
        </div>

        {/* Right: 2×2 matrix */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            {/* Y-axis label */}
            <div style={{
              position: 'absolute', left: '-28px', top: '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              fontSize: '9px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap',
            }}>
              Qualidade
            </div>

            {/* Chart area */}
            <div style={{
              width: `${chartW}px`, height: `${chartH}px`,
              position: 'relative', border: `1px solid #e2e8f0`,
              borderRadius: '6px', overflow: 'hidden',
              background: '#f8fafc',
            }}>
              {/* Quadrant backgrounds */}
              <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '50%', background: '#fef9c322' }} />
              <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '50%', background: '#f0fdf422' }} />
              <div style={{ position: 'absolute', left: 0, bottom: 0, width: '50%', height: '50%', background: '#f1f5f9' }} />
              <div style={{ position: 'absolute', right: 0, bottom: 0, width: '50%', height: '50%', background: '#fef2f222' }} />

              {/* Axis lines */}
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#cbd5e1' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#cbd5e1' }} />

              {/* Dots */}
              {dots.map((d, i) => {
                const cx = (d.x / 100) * chartW;
                const cy = chartH - (d.y / 100) * chartH;
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${cx}px`, top: `${cy}px`,
                    transform: 'translate(-50%, -50%)',
                    animation: `pitch-comp-pop 0.4s ease-out ${i * 0.1}s both`,
                  }}>
                    <div style={{
                      width: d.highlight ? '14px' : '10px',
                      height: d.highlight ? '14px' : '10px',
                      borderRadius: '50%',
                      background: d.highlight ? accent : '#94a3b8',
                      border: d.highlight ? `2px solid ${accent}` : '2px solid #64748b',
                      boxShadow: d.highlight ? `0 0 10px ${accent}88` : 'none',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: d.highlight ? '-18px' : '-16px',
                      left: '50%', transform: 'translateX(-50%)',
                      background: d.highlight ? accent : '#1e293b',
                      color: '#fff', fontSize: '8px', fontWeight: d.highlight ? 800 : 600,
                      borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap',
                    }}>
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis label */}
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '9px', fontWeight: 700, color: '#64748b' }}>
              Preco
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#94a3b8', marginTop: '1px' }}>
              <span>Baixo</span><span>Alto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
