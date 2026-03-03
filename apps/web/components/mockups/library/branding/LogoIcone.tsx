'use client';

import React from 'react';

interface LogoIconeProps {
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

export const LogoIcone: React.FC<LogoIconeProps> = ({
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
  const resolvedBrand = brandName || name || username || 'Marca';
  const resolvedTagline = headline || title || body || caption || description || text || 'Símbolo da marca';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const variants = [
    {
      label: 'Fundo Claro',
      bg: '#ffffff',
      border: '1px solid #e5e7eb',
      iconBg: accent,
      iconColor: '#fff',
      textColor: '#111827',
      subColor: '#6b7280',
      note: 'Uso primário',
      noteColor: accent,
    },
    {
      label: 'Fundo Escuro',
      bg: '#111827',
      border: '1px solid #374151',
      iconBg: '#ffffff',
      iconColor: accent,
      textColor: '#f9fafb',
      subColor: '#9ca3af',
      note: 'Uso em fundos escuros',
      noteColor: '#9ca3af',
    },
    {
      label: 'Fundo Colorido',
      bg: accent,
      border: `1px solid ${accent}`,
      iconBg: '#ffffff',
      iconColor: accent,
      textColor: '#ffffff',
      subColor: 'rgba(255,255,255,0.65)',
      note: 'Uso institucional',
      noteColor: 'rgba(255,255,255,0.8)',
    },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes li-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .li-wrap { animation: li-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Ícone · Três Variantes de Fundo
      </div>

      <div className="li-wrap" style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
        {variants.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: '12px',
              border: v.border,
              background: v.bg,
              padding: '24px 16px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            }}
          >
            {/* Icon/mark */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: v.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: i === 0 ? `0 6px 20px ${accent}44` : i === 1 ? '0 6px 16px rgba(0,0,0,0.4)' : '0 4px 14px rgba(0,0,0,0.25)',
                flexShrink: 0,
              }}
            >
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt={resolvedBrand}
                  style={{
                    width: '56px',
                    height: '56px',
                    objectFit: 'contain',
                    filter: i === 1 ? `drop-shadow(0 0 4px ${accent}88)` : 'none',
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: v.iconColor,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {initial}
                </span>
              )}
            </div>

            {/* Label */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: v.textColor, letterSpacing: '-0.01em' }}>
                {resolvedBrand}
              </div>
              <div style={{ fontSize: '10px', color: v.subColor, marginTop: '3px' }}>{resolvedTagline}</div>
            </div>

            {/* Variant name */}
            <div
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: v.noteColor,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                borderTop: `1px solid ${i === 0 ? '#f3f4f6' : i === 1 ? '#374151' : 'rgba(255,255,255,0.2)'}`,
                paddingTop: '10px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {v.label}
            </div>

            <div
              style={{
                fontSize: '9px',
                color: v.noteColor,
                opacity: 0.75,
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {v.note}
            </div>
          </div>
        ))}
      </div>

      {/* Size reference row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Proporções:
        </span>
        {[{ w: 24, label: '24px' }, { w: 40, label: '40px' }, { w: 56, label: '56px' }, { w: 80, label: '80px' }].map(({ w, label }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="" style={{ width: `${w}px`, height: `${w}px`, objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: `${w}px`,
                  height: `${w}px`,
                  borderRadius: `${Math.round(w * 0.22)}px`,
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: `${Math.round(w * 0.45)}px`,
                  fontWeight: 900,
                }}
              >
                {initial}
              </div>
            )}
            <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Ícone isolado · Proporção 1:1 · Bordas arredondadas conforme versão digital/impressa</div>
    </div>
  );
};
