'use client';

import React from 'react';

interface LogoMinimoProps {
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

export const LogoMinimo: React.FC<LogoMinimoProps> = ({
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
  const resolvedTagline = headline || title || body || caption || description || text || 'Versão simplificada';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const sizes = [
    { px: 16, label: '16px', context: 'Favicon / app icon' },
    { px: 32, label: '32px', context: 'Notificações / toolbar' },
    { px: 64, label: '64px', context: 'Avatar / miniatura' },
    { px: 96, label: '96px', context: 'Cabeçalho mobile' },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes lm-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lm-wrap { animation: lm-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Logo Mínimo · Versão Simplificada · Pequenas Dimensões
      </div>

      {/* Main card */}
      <div
        className="lm-wrap"
        style={{
          width: '360px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.09)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 16px',
            borderBottom: '1px solid #f3f4f6',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>{resolvedBrand} — Logo Mínimo</div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{resolvedTagline}</div>
          </div>
        </div>

        {/* Sizes grid */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* All sizes on white */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
              Sobre fundo claro
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '20px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #f3f4f6',
              }}
            >
              {sizes.map(({ px, label, context }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  {resolvedLogo ? (
                    <img
                      src={resolvedLogo}
                      alt={resolvedBrand}
                      style={{ width: `${px}px`, height: `${px}px`, objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: `${px}px`,
                        height: `${px}px`,
                        borderRadius: `${Math.max(2, Math.round(px * 0.18))}px`,
                        background: accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: `${Math.round(px * 0.48)}px`,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {px >= 24 ? initial : ''}
                    </div>
                  )}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151' }}>{label}</div>
                    <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '1px', maxWidth: '60px', textAlign: 'center', lineHeight: 1.3 }}>{context}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All sizes on dark */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
              Sobre fundo escuro
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '20px',
                padding: '16px',
                background: '#1f2937',
                borderRadius: '8px',
              }}
            >
              {sizes.map(({ px, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  {resolvedLogo ? (
                    <img
                      src={resolvedLogo}
                      alt={resolvedBrand}
                      style={{ width: `${px}px`, height: `${px}px`, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: `${px}px`,
                        height: `${px}px`,
                        borderRadius: `${Math.max(2, Math.round(px * 0.18))}px`,
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: accent,
                        fontSize: `${Math.round(px * 0.48)}px`,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {px >= 24 ? initial : ''}
                    </div>
                  )}
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rules footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #f3f4f6',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          {[
            { color: '#ef4444', rule: 'Não usar texto junto ao logo mínimo abaixo de 32px' },
            { color: '#f59e0b', rule: 'Manter contraste mínimo 4.5:1 em todos os fundos' },
            { color: '#22c55e', rule: 'Usar arquivo SVG para escalabilidade perfeita' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#374151' }}>{item.rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Versão simplificada · Detalhe mínimo · Ideal para tamanhos reduzidos</div>
    </div>
  );
};
