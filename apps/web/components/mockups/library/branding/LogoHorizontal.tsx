'use client';

import React from 'react';

interface LogoHorizontalProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const LogoHorizontal: React.FC<LogoHorizontalProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#1a56db',
}) => {
  const resolvedBrand = brandName || name || username || 'MarcaDigital';
  const resolvedTagline = headline || title || body || caption || description || text || 'Plataforma de Marketing';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();
  const UNIT = 20;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lh-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lh-wrap { animation: lh-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Horizontal · Área de Proteção
      </div>

      {/* Main canvas */}
      <div
        className="lh-wrap"
        style={{
          width: '380px',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.09)',
          overflow: 'hidden',
        }}
      >
        {/* Grid lines layer + exclusion zone */}
        <div
          style={{
            position: 'relative',
            height: '200px',
            background: '#fafafa',
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: `${UNIT}px ${UNIT}px`,
              opacity: 0.5,
            }}
          />

          {/* Exclusion zone dashed rectangle */}
          <div
            style={{
              position: 'absolute',
              top: UNIT,
              left: UNIT,
              right: UNIT,
              bottom: UNIT,
              border: `1.5px dashed ${accent}55`,
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />

          {/* Corner tick marks */}
          {[
            { top: UNIT - 5, left: UNIT - 5 },
            { top: UNIT - 5, right: UNIT - 5 },
            { bottom: UNIT - 5, left: UNIT - 5 },
            { bottom: UNIT - 5, right: UNIT - 5 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                border: `2px solid ${accent}`,
                borderRadius: '1px',
                ...pos,
              }}
            />
          ))}

          {/* Logo centred */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {/* Icon/mark */}
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={resolvedBrand}
                style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '30px',
                  fontWeight: 900,
                  flexShrink: 0,
                  boxShadow: `0 6px 20px ${accent}44`,
                }}
              >
                {initial}
              </div>
            )}

            {/* Vertical divider */}
            <div style={{ width: '1.5px', height: '52px', background: '#e5e7eb', flexShrink: 0 }} />

            {/* Wordmark */}
            <div>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 900,
                  color: '#111827',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {resolvedBrand}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: accent,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginTop: '5px',
                }}
              >
                {resolvedTagline}
              </div>
            </div>
          </div>

          {/* Spacing callout — top */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              color: `${accent}99`,
              fontWeight: 700,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <div style={{ width: '16px', height: '1px', background: `${accent}55` }} />
            x
            <div style={{ width: '16px', height: '1px', background: `${accent}55` }} />
          </div>

          {/* Spacing callout — left */}
          <div
            style={{
              position: 'absolute',
              left: '4px',
              top: '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              fontSize: '9px',
              color: `${accent}99`,
              fontWeight: 700,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <div style={{ width: '12px', height: '1px', background: `${accent}55` }} />
            x
            <div style={{ width: '12px', height: '1px', background: `${accent}55` }} />
          </div>
        </div>

        {/* Usage notes bar */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8f9fb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 20px',
          }}
        >
          {[
            { dot: accent, label: 'Área de exclusão = X (altura do ícone)' },
            { dot: '#22c55e', label: 'Fundo preferencial: branco ou claro' },
            { dot: '#ef4444', label: 'Não distorcer nem recolorir isoladamente' },
          ].map((note, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: note.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#374151' }}>{note.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Versão horizontal · Proporção recomendada: 4:1 · Mínimo 120px de largura</div>
    </div>
  );
};
