'use client';

import React, { useState } from 'react';

interface EstandeTotemProps {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
}

export const EstandeTotem: React.FC<EstandeTotemProps> = ({
  headline,
  title,
  name,
  username,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#2563eb',
  brandName,
}) => {
  const [lit, setLit] = useState(true);

  const resolvedHeadline = headline ?? title ?? name ?? 'Estande Totem';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Soluções inovadoras para o seu negócio';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const darkColor = brandColor + 'cc';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#d0cfc8', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes totem-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes totem-glow {
          0%, 100% { box-shadow: 0 0 12px ${brandColor}88; }
          50% { box-shadow: 0 0 24px ${brandColor}cc; }
        }
      `}</style>

      <div style={{ position: 'relative', width: '360px' }}>
        {/* Format badge */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: brandColor, color: '#fff',
          fontSize: '11px', fontWeight: '700',
          padding: '4px 10px', borderRadius: '4px', zIndex: 20,
        }}>
          Estande Totem
        </div>

        {/* Scene floor */}
        <div style={{
          width: '360px', height: '40px',
          background: 'linear-gradient(180deg, #c0bdb5 0%, #a0a090 100%)',
          borderRadius: '8px 8px 0 0',
        }} />

        {/* Booth base platform */}
        <div style={{
          width: '360px', background: '#b8b0a8',
          padding: '0 40px 16px', position: 'relative',
        }}>
          {/* Carpet */}
          <div style={{
            width: '280px', height: '12px',
            background: `linear-gradient(90deg, ${brandColor}33 0%, ${brandColor}55 50%, ${brandColor}33 100%)`,
            margin: '0 auto',
            borderRadius: '2px',
          }} />

          {/* Booth table/counter */}
          <div style={{
            width: '280px', margin: '0 auto',
            background: '#e8e4e0',
            borderRadius: '6px',
            border: '2px solid #c0b8b0',
            padding: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            {/* Counter surface */}
            <div style={{
              height: '40px', background: '#fff',
              borderRadius: '4px',
              border: `2px solid ${brandColor}44`,
              display: 'flex', alignItems: 'center',
              padding: '0 12px', gap: '8px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: brandColor }} />
              <div style={{ fontSize: '10px', color: '#555', fontWeight: '600' }}>Balcão de Atendimento</div>
            </div>
          </div>

          {/* Totem pole — tall central structure */}
          <div style={{
            position: 'absolute',
            top: '-380px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '110px',
          }}>
            {/* Totem body */}
            <div style={{
              width: '110px',
              height: '380px',
              background: resolvedImage
                ? 'transparent'
                : `linear-gradient(180deg, ${brandColor} 0%, ${darkColor} 100%)`,
              border: `3px solid ${brandColor}`,
              borderRadius: '8px 8px 0 0',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: lit ? `0 0 20px ${brandColor}66` : 'none',
              animation: lit ? 'totem-glow 2s ease-in-out infinite' : 'none',
            }}>
              {resolvedImage && (
                <img src={resolvedImage} alt="Totem" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}

              {/* Totem content overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '12px',
                background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
              }}>
                {/* Logo circle */}
                <div style={{
                  width: '60px', height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>
                    {resolvedBrand.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <div style={{
                  fontSize: '13px', fontWeight: '900', color: '#fff',
                  textAlign: 'center', lineHeight: 1.2,
                  textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                  marginBottom: '8px',
                }}>
                  {resolvedHeadline}
                </div>

                <div style={{
                  fontSize: '9px', color: 'rgba(255,255,255,0.85)',
                  textAlign: 'center', lineHeight: 1.4,
                  marginBottom: '16px',
                }}>
                  {resolvedBody}
                </div>

                {/* Brand strip */}
                <div style={{
                  background: 'rgba(255,255,255,0.95)',
                  color: brandColor,
                  fontWeight: '900',
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '3px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}>
                  {resolvedBrand}
                </div>

                {/* Dimension badge */}
                <div style={{
                  position: 'absolute', bottom: '6px', right: '6px',
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff', fontSize: '8px', fontWeight: '600',
                  padding: '2px 5px', borderRadius: '2px',
                }}>
                  60×200cm
                </div>
              </div>

              {/* Light indicator */}
              <div style={{
                position: 'absolute', top: '8px', left: '8px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: lit ? '#4ade80' : '#555',
                animation: lit ? 'totem-pulse 1.5s ease-in-out infinite' : 'none',
              }} />
            </div>

            {/* Totem base connector */}
            <div style={{
              width: '110px', height: '10px',
              background: '#5a5550',
              borderRadius: '0 0 4px 4px',
            }} />
          </div>
        </div>

        {/* Ground shadow */}
        <div style={{
          width: '360px', height: '14px',
          background: '#908880',
          borderRadius: '0 0 8px 8px',
        }} />

        {/* Light toggle button */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            aria-label="Alternar iluminação do totem"
            onClick={() => setLit(l => !l)}
            style={{
              background: lit ? brandColor : '#888',
              color: '#fff', border: 'none',
              padding: '6px 16px', borderRadius: '4px',
              fontSize: '11px', fontWeight: '700',
              cursor: 'pointer', letterSpacing: '0.5px',
            }}
          >
            {lit ? 'Iluminado' : 'Apagado'}
          </button>
        </div>

        {/* Caption */}
        <div style={{
          marginTop: '8px', textAlign: 'center',
          fontSize: '11px', color: '#555', fontWeight: '600',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          Estande Totem — Totem 60×200cm + Balcão
        </div>
      </div>
    </div>
  );
};
