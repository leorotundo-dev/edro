'use client';

import React from 'react';

interface KeynoteGraficoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteGrafico: React.FC<KeynoteGraficoProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const slideTitle = headline ?? title ?? 'Evolução de Resultados';
  const legendLabel = body ?? text ?? caption ?? description ??
    name ?? username ?? brandName ?? 'Receita mensal (R$ mil)';

  const bars = [
    { label: 'Jan', value: 55, color: `${accent}88` },
    { label: 'Fev', value: 68, color: `${accent}99` },
    { label: 'Mar', value: 72, color: `${accent}aa` },
    { label: 'Abr', value: 80, color: `${accent}bb` },
    { label: 'Mai', value: 91, color: accent },
  ];

  const maxVal = 100;

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* CSS animation */}
      <style>{`
        @keyframes kn-bar-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .kn-bar {
          animation: kn-bar-grow 0.8s ease-out both;
          transform-origin: bottom;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '18px', background: accent, borderRadius: '2px' }} />
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>{slideTitle}</h2>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: accent }} />
          <span style={{ fontSize: '9px', color: '#6b7280' }}>{legendLabel}</span>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, padding: '8px 24px 4px', display: 'flex', flexDirection: 'column' }}>
        {/* Y-axis labels + chart */}
        <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
          {/* Y-axis labels */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '24px' }}>
            {[100, 75, 50, 25, 0].map((v) => (
              <span key={v} style={{ fontSize: '8px', color: '#d1d5db', lineHeight: 1 }}>{v}</span>
            ))}
          </div>

          {/* Grid + bars */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Horizontal grid lines */}
            <div style={{ flex: 1, position: 'relative' }}>
              {[0, 25, 50, 75, 100].map((v) => (
                <div
                  key={v}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${v}%`,
                    height: '1px',
                    background: v === 0 ? '#9ca3af' : '#f0f0f0',
                  }}
                />
              ))}

              {/* Bar columns */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  paddingBottom: '1px',
                }}
              >
                {bars.map((bar, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      height: '100%',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {/* Value label on top */}
                    <span style={{ fontSize: '8px', fontWeight: 700, color: accent, marginBottom: '2px' }}>
                      {bar.value}
                    </span>
                    <div
                      className="kn-bar"
                      style={{
                        width: '44px',
                        height: `${(bar.value / maxVal) * 100}%`,
                        background: bar.color,
                        borderRadius: '4px 4px 0 0',
                        animationDelay: `${i * 0.12}s`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* X-axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '4px' }}>
              {bars.map((bar, i) => (
                <span key={i} style={{ fontSize: '9px', color: '#6b7280', width: '44px', textAlign: 'center' }}>
                  {bar.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* X-axis label */}
      <div style={{ textAlign: 'center', paddingBottom: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '8px', color: '#9ca3af' }}>Período — 2024</span>
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Gráfico
      </div>
    </div>
  );
};
