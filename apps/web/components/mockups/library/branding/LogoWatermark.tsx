'use client';

import React from 'react';

interface LogoWatermarkProps {
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

export const LogoWatermark: React.FC<LogoWatermarkProps> = ({
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
  const resolvedTagline = headline || title || body || caption || description || text || 'Todos os direitos reservados';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lwm-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lwm-wrap { animation: lwm-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Marca d'Água · Opacidade 15%
      </div>

      <div className="lwm-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Example 1: watermark over light photo/texture */}
        <div
          style={{
            width: '380px',
            height: '200px',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Simulated light photo texture */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 40%, #fef9c3 70%, #ffe4e6 100%)',
            }}
          />
          {/* Subtle noise/texture overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.6) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.4) 0%, transparent 40%)',
            }}
          />

          {/* Sample content */}
          <div style={{ position: 'absolute', inset: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: '#374151', fontWeight: 700, marginBottom: '4px' }}>Conteúdo protegido por marca d'água</div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>A marca d'água garante autoria mesmo após redistribuição</div>
          </div>

          {/* Watermark — centre, 15% opacity */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15,
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {resolvedLogo ? (
                <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
              ) : (
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '18px',
                    background: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '38px',
                    fontWeight: 900,
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>{resolvedBrand}</div>
            </div>
          </div>

          {/* Opacity callout badge */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#374151',
              backdropFilter: 'blur(4px)',
            }}
          >
            Opacidade: 15% · Sobre fundo claro
          </div>
        </div>

        {/* Example 2: watermark over dark bg */}
        <div
          style={{
            width: '380px',
            height: '160px',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0,0,0,0.12), 0 12px 32px rgba(0,0,0,0.20)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #1f2937 50%, #111827 100%)',
            }}
          />

          {/* Sample content */}
          <div style={{ position: 'absolute', inset: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: '4px' }}>Documento confidencial — uso interno</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{resolvedTagline}</div>
          </div>

          {/* Watermark — centre, 15% opacity white */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15,
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {resolvedLogo ? (
                <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '14px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#111827',
                    fontSize: '30px',
                    fontWeight: 900,
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>{resolvedBrand}</div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Opacidade: 15% · Sobre fundo escuro
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { color: accent, text: 'Opacidade máxima recomendada: 15–20%' },
          { color: '#22c55e', text: 'Posição: centro ou diagonal a 45°' },
          { color: '#f59e0b', text: 'Nunca bloquear conteúdo principal' },
        ].map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px 10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.color, flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: '#374151' }}>{n.text}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Marca d'água · Ghost logo 15% opacity · Proteção de conteúdo e autoria</div>
    </div>
  );
};
