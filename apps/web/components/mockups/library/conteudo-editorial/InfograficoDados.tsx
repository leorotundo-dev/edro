'use client';

import React from 'react';

interface InfograficoDadosProps {
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

export const InfograficoDados: React.FC<InfograficoDadosProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#0ea5e9',
}) => {
  const resolvedTitle = headline || title || name || 'Crescimento de Usuários por Trimestre';
  const resolvedSubtitle =
    body || text || description || caption || 'Evolução da base de usuários ativos ao longo de 2025.';
  const resolvedBrand = brandName || 'Fonte: Relatório Anual 2025';
  const accent = brandColor || '#0ea5e9';

  const data = [
    { label: 'Q1 2025', value: 42, raw: '42k' },
    { label: 'Q2 2025', value: 61, raw: '61k' },
    { label: 'Q3 2025', value: 78, raw: '78k' },
    { label: 'Q4 2025', value: 95, raw: '95k' },
    { label: 'Q1 2026', value: 100, raw: '112k' },
  ];

  const maxVal = Math.max(...data.map((d) => d.value));

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
        @keyframes id-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes id-bar { from { height: 0; } to { height: var(--bar-h); } }
        .id-card { animation: id-fade 0.4s ease; }
        .id-bar-inner { animation: id-bar 0.6s ease forwards; }
      `}</style>

      <div className="id-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 22px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · Dados
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Chart area */}
        <div style={{ padding: '22px 22px 8px' }}>
          {/* Y-axis labels */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '160px' }}>
            {/* Y-axis */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                paddingBottom: '20px',
              }}
            >
              {['100%', '75%', '50%', '25%', '0%'].map((l) => (
                <span key={l} style={{ fontSize: '9px', color: '#d1d5db', lineHeight: 1 }}>{l}</span>
              ))}
            </div>

            {/* Grid + bars */}
            <div
              style={{
                flex: 1,
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
              }}
            >
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <div
                  key={pct}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `calc(20px + ${pct}% * (140px / 100))`,
                    height: '1px',
                    background: pct === 0 ? '#d1d5db' : '#f3f4f6',
                  }}
                />
              ))}

              {/* Bars */}
              {data.map((d, i) => {
                const barH = Math.round((d.value / maxVal) * 140);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      gap: '4px',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {/* Value label */}
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: accent,
                        marginBottom: '2px',
                      }}
                    >
                      {d.raw}
                    </div>
                    {/* Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: `${barH}px`,
                        background: `linear-gradient(180deg, ${accent} 0%, ${accent}bb 100%)`,
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s ease',
                      }}
                    />
                    {/* X label */}
                    <div
                      style={{
                        fontSize: '9px',
                        color: '#6b7280',
                        textAlign: 'center',
                        marginTop: '4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: '#f3f4f6',
            borderTop: '1px solid #f3f4f6',
            margin: '8px 0 0',
          }}
        >
          {[
            { label: 'Crescimento Total', val: '+167%' },
            { label: 'Pico Trimestral', val: 'Q1 2026' },
            { label: 'Média Trimestral', val: '75k' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: accent, letterSpacing: '-0.02em' }}>{s.val}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Source */}
        <div style={{ padding: '10px 22px 14px' }}>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{resolvedBrand}</span>
        </div>
      </div>
    </div>
  );
};
