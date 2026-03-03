'use client';

import React from 'react';

interface LogoNegativoProps {
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

export const LogoNegativo: React.FC<LogoNegativoProps> = ({
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
  const resolvedTagline = headline || title || body || caption || description || text || 'Versão negativa da marca';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const darkBgs = [
    { bg: '#000000', label: 'Preto puro', hex: '#000000' },
    { bg: '#111827', label: 'Carvão', hex: '#111827' },
    { bg: '#1e1b4b', label: 'Azul noite', hex: '#1e1b4b' },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lneg-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lneg-wrap { animation: lneg-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Negativo · Versão sobre fundos escuros
      </div>

      <div className="lneg-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {darkBgs.map((bg, i) => (
          <div
            key={i}
            style={{
              borderRadius: '12px',
              background: bg.bg,
              padding: '28px 28px 22px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15), 0 12px 32px rgba(0,0,0,0.25)',
            }}
          >
            {/* Subtle decorative ring */}
            <div
              style={{
                position: 'absolute',
                right: '-40px',
                top: '-40px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.05)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '-10px',
                top: '-10px',
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              }}
            />

            {/* Logo row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt={resolvedBrand}
                  style={{ height: '52px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                />
              ) : (
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: bg.bg,
                    fontSize: '24px',
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </div>
              )}

              <div style={{ borderLeft: '1.5px solid rgba(255,255,255,0.15)', paddingLeft: '14px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {resolvedBrand}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                  {resolvedTagline}
                </div>
              </div>

              {/* Bg label chip */}
              <div
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '2px',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{bg.label}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{bg.hex}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage notes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}
      >
        {[
          { icon: '✓', color: '#22c55e', text: 'Use em fundos escuros (luminosidade < 35%)' },
          { icon: '✓', color: '#22c55e', text: 'Mantenha o logo branco 100% sem tons' },
          { icon: '✗', color: '#ef4444', text: 'Não use sobre fundos médios (50% cinza)' },
          { icon: '✗', color: '#ef4444', text: 'Não adicione sombra ao logo negativo' },
        ].map((note, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', background: '#f9fafb', borderRadius: '6px', padding: '8px 10px', border: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: '11px', color: note.color, fontWeight: 900, flexShrink: 0, marginTop: '1px' }}>{note.icon}</span>
            <span style={{ fontSize: '10px', color: '#374151', lineHeight: 1.4 }}>{note.text}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Logo negativo · Versão clara sobre fundo escuro · Exportar em PNG com fundo transparente</div>
    </div>
  );
};
