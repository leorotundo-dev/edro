'use client';

import React from 'react';

interface LogoVerticalProps {
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

export const LogoVertical: React.FC<LogoVerticalProps> = ({
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

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lvert-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lvert-wrap { animation: lvert-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Vertical · Ícone sobre Wordmark
      </div>

      <div className="lvert-wrap" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* Main vertical logo on white */}
        <div
          style={{
            width: '180px',
            borderRadius: '14px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.09)',
            padding: '32px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          {/* Dot grid bg */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              borderRadius: '14px',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 24px ${accent}44`,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={resolvedBrand}
                style={{ width: '56px', height: '56px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '38px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                {initial}
              </span>
            )}
          </div>

          {/* Wordmark */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#111827',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {resolvedBrand}
            </div>
            <div
              style={{
                fontSize: '9px',
                color: accent,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: '6px',
              }}
            >
              {resolvedTagline}
            </div>
          </div>

          <div style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 600, marginTop: '4px' }}>Versão vertical · Fundo claro</div>
        </div>

        {/* Vertical logo on dark */}
        <div
          style={{
            width: '180px',
            borderRadius: '14px',
            background: '#111827',
            border: '1px solid #1f2937',
            boxShadow: '0 4px 6px rgba(0,0,0,0.15), 0 12px 32px rgba(0,0,0,0.25)',
            padding: '32px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={resolvedBrand}
                style={{ width: '56px', height: '56px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '38px', fontWeight: 900, color: accent, letterSpacing: '-0.03em' }}>
                {initial}
              </span>
            )}
          </div>

          {/* Wordmark */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {resolvedBrand}
            </div>
            <div
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: '6px',
              }}
            >
              {resolvedTagline}
            </div>
          </div>

          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginTop: '4px' }}>Versão vertical · Fundo escuro</div>
        </div>
      </div>

      {/* Usage notes */}
      <div
        style={{
          padding: '10px 14px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}
      >
        {[
          'Usar quando o espaço horizontal for limitado (ex: avatars, perfis)',
          'Mínimo 120px de largura para a versão vertical',
          'Proporção ícone/wordmark sempre 1:1 de largura',
        ].map((rule, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: accent, flexShrink: 0, marginTop: '5px' }} />
            <span style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.5 }}>{rule}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Logo vertical · Ícone centralizado acima do wordmark · Exportar SVG + PNG</div>
    </div>
  );
};
