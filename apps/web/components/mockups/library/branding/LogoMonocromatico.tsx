'use client';

import React from 'react';

interface LogoMonocromaticoProps {
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

export const LogoMonocromatico: React.FC<LogoMonocromaticoProps> = ({
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
  const resolvedTagline = headline || title || body || caption || description || text || 'Versão monocromática';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const variants = [
    {
      id: 'black',
      label: 'Preto · #000000',
      sublabel: 'Impressão 1 cor / fax / cópia',
      bg: '#ffffff',
      border: '1px solid #e5e7eb',
      iconBg: '#000000',
      iconColor: '#ffffff',
      wordColor: '#000000',
      subColor: '#555555',
      filter: 'brightness(0)',
    },
    {
      id: 'white',
      label: 'Branco · #FFFFFF',
      sublabel: 'Fundo escuro / serigrafia',
      bg: '#1a1a2e',
      border: '1px solid #2d2d4e',
      iconBg: '#ffffff',
      iconColor: '#1a1a2e',
      wordColor: '#ffffff',
      subColor: 'rgba(255,255,255,0.55)',
      filter: 'brightness(0) invert(1)',
    },
    {
      id: 'gray',
      label: '50% Cinza · #808080',
      sublabel: 'Documentos internos / rascunho',
      bg: '#f5f5f5',
      border: '1px solid #e0e0e0',
      iconBg: '#808080',
      iconColor: '#ffffff',
      wordColor: '#808080',
      subColor: '#aaaaaa',
      filter: 'grayscale(1) opacity(0.5)',
    },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lmono-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lmono-wrap { animation: lmono-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Monocromático · Três Variantes
      </div>

      <div className="lmono-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {variants.map((v) => (
          <div
            key={v.id}
            style={{
              borderRadius: '10px',
              border: v.border,
              background: v.bg,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '13px',
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
                  style={{ width: '38px', height: '38px', objectFit: 'contain', filter: v.id === 'white' ? 'brightness(0)' : 'brightness(0) invert(1)' }}
                />
              ) : (
                <span style={{ fontSize: '26px', fontWeight: 900, color: v.iconColor, letterSpacing: '-0.02em' }}>
                  {initial}
                </span>
              )}
            </div>

            {/* Wordmark + tagline */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: v.wordColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {resolvedBrand}
              </div>
              <div style={{ fontSize: '10px', color: v.subColor, marginTop: '4px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                {resolvedTagline}
              </div>
            </div>

            {/* Tag */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: v.wordColor,
                  opacity: 0.8,
                  background: v.id === 'white' ? 'rgba(255,255,255,0.12)' : v.id === 'gray' ? '#e8e8e8' : '#f3f4f6',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                {v.label}
              </div>
              <div style={{ fontSize: '9px', color: v.subColor, textAlign: 'right', maxWidth: '120px', lineHeight: 1.3 }}>
                {v.sublabel}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage rules */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', marginBottom: '2px' }}>Diretrizes de uso monocromático:</div>
        {[
          'Use preto quando o fundo for branco ou muito claro (contraste ≥ 7:1)',
          'Use branco apenas sobre fundos com luminosidade inferior a 40%',
          'A versão cinza 50% é exclusiva para documentos internos não publicados',
          `Nunca use a versão colorida original (${accent}) sem autorização do responsável pela marca`,
        ].map((rule, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#9ca3af', flexShrink: 0, marginTop: '5px' }} />
            <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.5 }}>{rule}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Logo monocromático · Versão 1 cor · Para impressão, bordado e gravação</div>
    </div>
  );
};
