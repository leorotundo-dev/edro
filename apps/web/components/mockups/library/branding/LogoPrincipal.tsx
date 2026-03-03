'use client';

import React from 'react';

interface LogoPrincipalProps {
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

export const LogoPrincipal: React.FC<LogoPrincipalProps> = ({
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
  const X = 24; // exclusion zone unit in px

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lp-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lp-wrap { animation: lp-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Principal · Área de Exclusão
      </div>

      <div
        className="lp-wrap"
        style={{
          width: '380px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.09)',
          overflow: 'hidden',
        }}
      >
        {/* Canvas with dot grid */}
        <div
          style={{
            position: 'relative',
            height: '240px',
            background: '#fafbff',
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, #c7d2fe 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              opacity: 0.6,
            }}
          />

          {/* Outer clear-space zone */}
          <div
            style={{
              position: 'absolute',
              top: X,
              left: X,
              right: X,
              bottom: X,
              border: `1.5px dashed ${accent}66`,
              borderRadius: '6px',
            }}
          />

          {/* Corner "X" distance markers */}
          {(['top', 'bottom'] as const).map((vert) =>
            (['left', 'right'] as const).map((horiz) => (
              <div
                key={`${vert}-${horiz}`}
                style={{
                  position: 'absolute',
                  [vert]: X - 7,
                  [horiz]: X - 7,
                  width: '14px',
                  height: '14px',
                  border: `2px solid ${accent}`,
                  borderRadius: '2px',
                  background: '#fff',
                }}
              />
            ))
          )}

          {/* Arrow callout — horizontal */}
          <div
            style={{
              position: 'absolute',
              top: X / 2 - 5,
              left: X,
              right: X,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: `${accent}55` }} />
            <span style={{ fontSize: '9px', color: accent, fontWeight: 700, padding: '0 4px', background: '#fafbff' }}>X</span>
            <div style={{ flex: 1, height: '1px', background: `${accent}55` }} />
          </div>

          {/* Arrow callout — vertical left */}
          <div
            style={{
              position: 'absolute',
              left: X / 2 - 5,
              top: X,
              bottom: X,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ flex: 1, width: '1px', background: `${accent}55` }} />
            <span
              style={{
                fontSize: '9px',
                color: accent,
                fontWeight: 700,
                padding: '2px 0',
                background: '#fafbff',
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              X
            </span>
            <div style={{ flex: 1, width: '1px', background: `${accent}55` }} />
          </div>

          {/* Logo centred */}
          <div
            style={{
              position: 'absolute',
              inset: X * 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
            }}
          >
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedBrand} style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
            ) : (
              <>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '14px',
                    background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '28px',
                    fontWeight: 900,
                    boxShadow: `0 6px 20px ${accent}44`,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {resolvedBrand}
                  </div>
                  <div style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '5px' }}>
                    {resolvedTagline}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* "Área de exclusão = X" callout box */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '14px',
              background: `${accent}11`,
              border: `1px solid ${accent}33`,
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '9px',
              color: accent,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            Área de exclusão = X = altura do ícone
          </div>
        </div>

        {/* Info bar */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f8f9fb',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 24px',
          }}
        >
          {[
            { color: accent, text: 'Nenhum elemento dentro da área de exclusão' },
            { color: '#22c55e', text: 'Mínimo 80px de largura na versão digital' },
            { color: '#ef4444', text: 'Não alterar proporções, cores ou tipografia' },
          ].map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#374151' }}>{n.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Logo principal · Versão primária · SVG + PNG 2x fornecidos no brandbook</div>
    </div>
  );
};
