'use client';

import React from 'react';

interface JornalFaixaProps {
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

export const JornalFaixa: React.FC<JornalFaixaProps> = ({
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
  brandColor = '#1a1a1a',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Promoção exclusiva por tempo limitado';
  const bodyText = body ?? caption ?? description ?? text ?? 'Acesse agora e garanta a oferta';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 560,
        background: '#faf9f5',
        fontFamily: '"Georgia", "Times New Roman", serif',
        border: '2px solid #111',
        borderTop: `5px solid ${brandColor}`,
        boxShadow: '0 3px 14px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes jfx-slide { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .jfx-slide { animation: jfx-slide 0.4s ease both; }
        @keyframes jfx-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        .jfx-cta { animation: jfx-pulse 2s ease infinite; }
      `}</style>

      {/* Main strip */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 80 }}>

        {/* Left accent bar */}
        <div style={{ width: 6, background: brandColor, flexShrink: 0 }} />

        {/* Logo/brand area */}
        <div
          style={{
            width: 120,
            background: '#111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
            flexShrink: 0,
          }}
          className="jfx-slide"
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -0.3,
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {brand}
          </div>
          <div style={{ width: 28, height: 2, background: brandColor, marginTop: 5 }} />
          <div
            style={{
              fontSize: 7.5,
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'sans-serif',
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Publicidade
          </div>
        </div>

        {/* Optional image */}
        {heroImage && (
          <div style={{ width: 90, flexShrink: 0, overflow: 'hidden' }}>
            <img
              src={heroImage}
              alt={mainHeadline}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Headline + copy */}
        <div
          style={{
            flex: 1,
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: heroImage ? 'none' : '1px solid #ddd',
          }}
        >
          <div
            style={{
              fontSize: 7.5,
              fontFamily: 'sans-serif',
              color: brandColor,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Faixa de página
          </div>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.2,
              margin: '0 0 4px',
              letterSpacing: -0.2,
            }}
          >
            {mainHeadline}
          </h2>
          <p style={{ fontSize: 9.5, color: '#555', margin: 0, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            {bodyText}
          </p>
        </div>

        {/* CTA button area */}
        <div
          style={{
            width: 110,
            background: brandColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
            flexShrink: 0,
          }}
          className="jfx-cta"
        >
          <div
            style={{
              fontSize: 10,
              color: '#fff',
              fontWeight: 700,
              fontFamily: 'sans-serif',
              textAlign: 'center',
              lineHeight: 1.3,
              marginBottom: 5,
            }}
          >
            Acesse Já!
          </div>
          <div
            style={{
              fontSize: 8,
              color: 'rgba(255,255,255,0.75)',
              fontFamily: 'sans-serif',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            (11) 9 9999-0000
          </div>
          <div
            style={{
              width: 36,
              height: 1,
              background: 'rgba(255,255,255,0.3)',
              margin: '4px 0',
            }}
          />
          <div
            style={{
              fontSize: 7.5,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'sans-serif',
              textAlign: 'center',
            }}
          >
            www.{brand.toLowerCase().replace(/\s/g, '')}.com.br
          </div>
        </div>
      </div>

      {/* Bottom thin rule with colophon */}
      <div
        style={{
          height: 20,
          background: '#f0ede0',
          borderTop: '1px solid #d0cfc0',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 130,
          paddingRight: 14,
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 7.5,
            color: '#aaa',
            fontFamily: 'sans-serif',
            letterSpacing: 0.5,
          }}
        >
          Anúncio comercial — {brand.toUpperCase()}
        </div>
        <div style={{ flex: 1, height: 1, background: '#ddd' }} />
        <div style={{ fontSize: 7.5, color: '#ccc', fontFamily: 'sans-serif' }}>
          Faixa 560×80px
        </div>
      </div>
    </div>
  );
};
