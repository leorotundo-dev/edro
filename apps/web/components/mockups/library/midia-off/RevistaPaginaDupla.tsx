'use client';

import React from 'react';

interface RevistaPaginaDuplaProps {
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

export const RevistaPaginaDupla: React.FC<RevistaPaginaDuplaProps> = ({
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
  brandColor = '#8e44ad',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Duas páginas. Uma história inesquecível.';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'O formato duplo cria um impacto visual sem igual. Use este espaço panorâmico para apresentar sua marca com a grandiosidade que ela merece.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 600,
        height: 454,
        background: '#111',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes rpd-in { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
        .rpd-in { animation: rpd-in 0.65s ease both; }
      `}</style>

      {/* Full-bleed panoramic image */}
      <div style={{ position: 'absolute', inset: 0 }} className="rpd-in">
        {heroImage ? (
          <img
            src={heroImage}
            alt={mainHeadline}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(100deg, #1a1a2e 0%, ${brandColor}33 40%, #0d0d0d 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="0.7">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
        {/* Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)',
          }}
        />
        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 220,
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Gutter crease at centre */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 3,
          height: '100%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Top badge */}
      <div style={{ position: 'absolute', top: 16, left: 20, zIndex: 4 }}>
        <div style={{ background: brandColor, padding: '3px 12px' }}>
          <span
            style={{
              fontSize: 8,
              color: '#fff',
              fontFamily: 'sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            Página dupla
          </span>
        </div>
      </div>

      {/* Centred headline overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          zIndex: 4,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        <div style={{ width: 50, height: 3, background: brandColor, margin: '0 auto 14px' }} />
        <h2
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            margin: '0 0 12px',
            letterSpacing: -0.5,
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}
        >
          {mainHeadline}
        </h2>
        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 1.55,
            margin: '0 auto',
            fontFamily: 'sans-serif',
            maxWidth: 400,
          }}
        >
          {bodyText}
        </p>
      </div>

      {/* Bottom brand strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 4,
          height: 48,
          background: 'rgba(0,0,0,0.75)',
          borderTop: `2px solid ${brandColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: -0.3 }}>
          {brand.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontFamily: 'sans-serif' }}>
            (11) 9 9999-0000
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontFamily: 'sans-serif' }}>
            www.{brand.toLowerCase().replace(/\s/g, '')}.com.br
          </span>
        </div>
      </div>
    </div>
  );
};
