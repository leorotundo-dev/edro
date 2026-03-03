'use client';

import React from 'react';

interface InfograficoMapaProps {
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

export const InfograficoMapa: React.FC<InfograficoMapaProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#10b981',
}) => {
  const resolvedTitle = headline || title || name || 'Presença Regional no Brasil';
  const resolvedSubtitle =
    body || text || description || caption || 'Distribuição de clientes e parceiros por região.';
  const resolvedBrand = brandName || 'Fonte: Dados internos 2025';
  const accent = brandColor || '#10b981';

  const regions = [
    { id: 'norte', label: 'Norte', x: 160, y: 90, value: '1.2k', pct: 8 },
    { id: 'nordeste', label: 'Nordeste', x: 270, y: 120, value: '4.8k', pct: 22 },
    { id: 'centroeste', label: 'Centro-Oeste', x: 190, y: 200, value: '3.1k', pct: 15 },
    { id: 'sudeste', label: 'Sudeste', x: 250, y: 270, value: '9.4k', pct: 42 },
    { id: 'sul', label: 'Sul', x: 210, y: 340, value: '2.8k', pct: 13 },
  ];

  const maxPct = Math.max(...regions.map((r) => r.pct));

  return (
    <div
      style={{
        width: '400px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes imap-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .imap-card { animation: imap-fade 0.4s ease; }
        .imap-pin:hover { transform: scale(1.15); }
        .imap-pin { transition: transform 0.2s; cursor: default; }
      `}</style>

      <div className="imap-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 22px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · Mapa
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Map + legend row */}
        <div style={{ display: 'flex', padding: '16px 16px 8px', gap: '12px' }}>
          {/* SVG Map of Brazil (simplified outline) */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg
              width="220"
              height="260"
              viewBox="0 0 400 480"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Simplified Brazil outline */}
              <path
                d="M180,30 L240,20 L300,40 L340,80 L360,130 L350,180 L330,220 L340,260 L320,310 L290,350 L260,400 L240,440 L210,450 L190,440 L170,410 L150,380 L130,340 L120,290 L110,240 L100,190 L110,140 L130,100 L150,60 Z"
                fill={`${accent}15`}
                stroke={`${accent}60`}
                strokeWidth="2"
              />
              {/* State dividers (very simplified) */}
              <line x1="180" y1="30" x2="200" y2="200" stroke={`${accent}30`} strokeWidth="1" strokeDasharray="4,4" />
              <line x1="240" y1="20" x2="210" y2="200" stroke={`${accent}30`} strokeWidth="1" strokeDasharray="4,4" />
              <line x1="100" y1="190" x2="330" y2="220" stroke={`${accent}30`} strokeWidth="1" strokeDasharray="4,4" />
              <line x1="120" y1="290" x2="320" y2="310" stroke={`${accent}30`} strokeWidth="1" strokeDasharray="4,4" />

              {/* Region pins */}
              {regions.map((r) => {
                const size = 8 + (r.pct / maxPct) * 12;
                return (
                  <g key={r.id} className="imap-pin">
                    <circle
                      cx={r.x}
                      cy={r.y}
                      r={size}
                      fill={accent}
                      fillOpacity={0.25 + (r.pct / maxPct) * 0.55}
                    />
                    <circle
                      cx={r.x}
                      cy={r.y}
                      r={5}
                      fill={accent}
                    />
                    <text
                      x={r.x + size + 4}
                      y={r.y + 4}
                      fontSize="11"
                      fill="#374151"
                      fontFamily="Helvetica Neue, sans-serif"
                      fontWeight="700"
                    >
                      {r.value}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend / bar list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
            {regions.map((r) => (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>{r.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: accent }}>{r.pct}%</span>
                </div>
                <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${r.pct}%`,
                      background: accent,
                      borderRadius: '3px',
                    }}
                  />
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{r.value} clientes</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 22px 14px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{resolvedBrand}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent }} />
            <span style={{ fontSize: '10px', color: '#6b7280' }}>Volume de clientes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
