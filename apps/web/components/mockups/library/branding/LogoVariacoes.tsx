'use client';

import React from 'react';

interface LogoVariacoesProps {
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

export const LogoVariacoes: React.FC<LogoVariacoesProps> = ({
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
  const resolvedTagline = headline || title || body || caption || description || text || 'Plataforma Digital';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const variations = [
    {
      id: 'principal',
      label: 'Principal',
      sublabel: 'Uso padrão',
      bg: '#ffffff',
      border: '1px solid #e5e7eb',
      iconBg: accent,
      iconColor: '#fff',
      wordColor: '#111827',
      subColor: accent,
      logoFilter: 'none',
      horizontal: true,
    },
    {
      id: 'negativo',
      label: 'Negativo',
      sublabel: 'Fundo escuro',
      bg: '#111827',
      border: '1px solid #1f2937',
      iconBg: '#ffffff',
      iconColor: '#111827',
      wordColor: '#ffffff',
      subColor: 'rgba(255,255,255,0.55)',
      logoFilter: 'brightness(0) invert(1)',
      horizontal: true,
    },
    {
      id: 'monocromatico',
      label: 'Monocromático',
      sublabel: 'Impressão 1 cor',
      bg: '#ffffff',
      border: '1px solid #e5e7eb',
      iconBg: '#000000',
      iconColor: '#ffffff',
      wordColor: '#000000',
      subColor: '#666666',
      logoFilter: 'brightness(0)',
      horizontal: true,
    },
    {
      id: 'vertical',
      label: 'Vertical',
      sublabel: 'Avatar / perfil',
      bg: '#ffffff',
      border: '1px solid #e5e7eb',
      iconBg: accent,
      iconColor: '#fff',
      wordColor: '#111827',
      subColor: accent,
      logoFilter: 'none',
      horizontal: false,
    },
    {
      id: 'icone',
      label: 'Ícone',
      sublabel: 'Favicon / app',
      bg: '#f9fafb',
      border: '1px solid #e5e7eb',
      iconBg: accent,
      iconColor: '#fff',
      wordColor: '#111827',
      subColor: '#6b7280',
      logoFilter: 'none',
      horizontal: false,
    },
    {
      id: 'colorido',
      label: 'Colorido',
      sublabel: 'Uso institucional',
      bg: accent,
      border: `1px solid ${accent}`,
      iconBg: '#ffffff',
      iconColor: accent,
      wordColor: '#ffffff',
      subColor: 'rgba(255,255,255,0.7)',
      logoFilter: 'brightness(0)',
      horizontal: false,
    },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lv-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lv-wrap { animation: lv-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Variações do Logo · Grade 2×3
      </div>

      <div
        className="lv-wrap"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '400px',
        }}
      >
        {variations.map((v) => (
          <div
            key={v.id}
            style={{
              borderRadius: '10px',
              border: v.border,
              background: v.bg,
              padding: v.horizontal ? '16px 16px 12px' : '20px 16px 12px',
              display: 'flex',
              flexDirection: v.horizontal ? 'row' : 'column',
              alignItems: 'center',
              gap: v.horizontal ? '10px' : '10px',
              justifyContent: v.horizontal ? 'flex-start' : 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              minHeight: '80px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: v.horizontal ? '36px' : '48px',
                height: v.horizontal ? '36px' : '48px',
                borderRadius: v.horizontal ? '9px' : '12px',
                background: v.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt={resolvedBrand}
                  style={{
                    width: v.horizontal ? '24px' : '32px',
                    height: v.horizontal ? '24px' : '32px',
                    objectFit: 'contain',
                    filter: v.logoFilter,
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: v.horizontal ? '16px' : '22px',
                    fontWeight: 900,
                    color: v.iconColor,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {initial}
                </span>
              )}
            </div>

            {/* Text (only for horizontal, or vertical with brand name) */}
            {(v.horizontal || v.id === 'vertical') && (
              <div style={{ textAlign: v.horizontal ? 'left' : 'center' }}>
                {v.horizontal && (
                  <div style={{ fontSize: '13px', fontWeight: 800, color: v.wordColor, letterSpacing: '-0.01em', lineHeight: 1 }}>
                    {resolvedBrand}
                  </div>
                )}
                {v.id === 'vertical' && (
                  <div style={{ fontSize: '13px', fontWeight: 800, color: v.wordColor, letterSpacing: '-0.01em', lineHeight: 1, marginTop: '2px' }}>
                    {resolvedBrand}
                  </div>
                )}
              </div>
            )}

            {/* Label always at bottom for icon-only cards */}
            {(!v.horizontal && v.id !== 'vertical') && (
              <div style={{ fontSize: '11px', fontWeight: 700, color: v.wordColor, marginTop: '4px' }}>
                {resolvedBrand.split(' ')[0]}
              </div>
            )}

            {/* Variant label */}
            <div
              style={{
                marginLeft: v.horizontal ? 'auto' : undefined,
                marginTop: !v.horizontal ? 'auto' : undefined,
                display: 'flex',
                flexDirection: 'column',
                alignItems: v.horizontal ? 'flex-end' : 'center',
                gap: '2px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: v.wordColor,
                  opacity: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {v.label}
              </div>
              <div style={{ fontSize: '8px', color: v.subColor, opacity: 0.8 }}>
                {v.sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>
        Todas as variações do brandbook · Selecionar conforme contexto de aplicação
      </div>
    </div>
  );
};
