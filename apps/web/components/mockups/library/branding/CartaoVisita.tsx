'use client';

import React from 'react';

interface CartaoVisitaProps {
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

export const CartaoVisita: React.FC<CartaoVisitaProps> = ({
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
  const resolvedName = name || username || brandName || 'Ana Beatriz Costa';
  const resolvedTitle = headline || title || 'Diretora de Marketing';
  const resolvedBrand = brandName || 'Empresa Digital Ltda.';
  const resolvedBody = body || caption || description || text || '';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';

  // Derive a slightly darker shade for depth
  const accentDark = accent;

  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'flex-start',
      }}
    >
      <style>{`
        @keyframes cv-appear { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .cv-card { animation: cv-appear 0.45s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      {/* Label */}
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Cartão de Visita · 9×5 cm · Frente
      </div>

      {/* Front face */}
      <div
        className="cv-card"
        style={{
          width: '340px',
          height: '200px',
          borderRadius: '10px',
          background: '#ffffff',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 14px 36px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.9)',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left color accent bar */}
        <div
          style={{
            width: '8px',
            flexShrink: 0,
            background: `linear-gradient(180deg, ${accent} 0%, ${accentDark}cc 100%)`,
          }}
        />

        {/* Main content */}
        <div style={{ flex: 1, padding: '22px 22px 18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top: Logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={resolvedBrand}
                style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '6px' }}
              />
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {resolvedBrand.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>{resolvedBrand}</div>
              {resolvedBody ? (
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>{resolvedBody}</div>
              ) : null}
            </div>

            {/* Embossed circle decoration */}
            <div
              style={{
                marginLeft: 'auto',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: `2px solid ${accent}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `${accent}18`,
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: `linear-gradient(90deg, ${accent}40, transparent)`, margin: '0' }} />

          {/* Middle: Name + role */}
          <div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {resolvedName}
            </div>
            <div style={{ fontSize: '11px', color: accent, fontWeight: 700, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {resolvedTitle}
            </div>
          </div>

          {/* Bottom: contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { icon: 'M', label: 'contato@empresadigital.com.br' },
              { icon: 'T', label: '+55 (11) 99999-9999' },
              { icon: 'W', label: 'www.empresadigital.com.br' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px',
                    background: `${accent}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    fontWeight: 800,
                    color: accent,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <span style={{ fontSize: '10px', color: '#4b5563' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Back face */}
      <div
        style={{
          width: '340px',
          height: '200px',
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.07), 0 14px 36px rgba(0,0,0,0.13)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', left: '-20px', bottom: '-50px', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ textAlign: 'center', position: 'relative' }}>
          {resolvedLogo ? (
            <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '60px', height: '60px', objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
          ) : (
            <div style={{ fontSize: '44px', fontWeight: 900, color: 'rgba(255,255,255,0.22)', letterSpacing: '-0.04em', marginBottom: '8px', lineHeight: 1 }}>
              {resolvedBrand.charAt(0)}
            </div>
          )}
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>{resolvedBrand}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '4px', letterSpacing: '0.05em' }}>
            www.empresadigital.com.br
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
          Verso
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Formato: 90×50mm · Impressão 4/4 · Couchê 300g</div>
    </div>
  );
};
