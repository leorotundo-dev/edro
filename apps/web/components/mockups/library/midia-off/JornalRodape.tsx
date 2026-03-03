'use client';

import React from 'react';

interface JornalRodapeProps {
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

export const JornalRodape: React.FC<JornalRodapeProps> = ({
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
  const mainHeadline = headline ?? title ?? 'Sua melhor opção está bem aqui';
  const bodyText = body ?? caption ?? description ?? text ?? 'Ligue agora e aproveite condições especiais';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 560,
        background: '#faf9f5',
        fontFamily: '"Georgia", "Times New Roman", serif',
        border: '2px solid #111',
        borderTop: `5px solid ${brandColor}`,
        boxShadow: '0 -2px 14px rgba(0,0,0,0.14)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes jrod-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .jrod-in { animation: jrod-in 0.4s ease both; }
        @keyframes jrod-pulse { 0%,100%{opacity:1} 50%{opacity:0.85} }
        .jrod-cta { animation: jrod-pulse 2s ease infinite; }
      `}</style>

      {/* Main strip */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 90 }}>

        {/* Brand block */}
        <div
          style={{
            width: 130,
            background: '#111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
            flexShrink: 0,
          }}
          className="jrod-in"
        >
          <div
            style={{
              fontSize: 14,
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
          <div style={{ width: 24, height: 2, background: brandColor, marginTop: 5 }} />
          <div
            style={{
              fontSize: 7,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'sans-serif',
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Rodapé
          </div>
        </div>

        {/* Optional hero image */}
        {heroImage && (
          <div style={{ width: 90, flexShrink: 0, overflow: 'hidden' }}>
            <img
              src={heroImage}
              alt={mainHeadline}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Main copy */}
        <div
          style={{
            flex: 1,
            padding: '0 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: heroImage ? 'none' : '1px solid #ddd',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 7,
              fontFamily: 'sans-serif',
              color: brandColor,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              fontWeight: 700,
            }}
          >
            Rodapé de página
          </div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: -0.2,
            }}
          >
            {mainHeadline}
          </h2>
          <p style={{ fontSize: 9.5, color: '#555', margin: 0, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            {bodyText}
          </p>
        </div>

        {/* Right CTA column */}
        <div
          style={{
            width: 115,
            background: brandColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            flexShrink: 0,
            gap: 3,
          }}
          className="jrod-cta"
        >
          <div
            style={{
              fontSize: 10,
              color: '#fff',
              fontWeight: 700,
              fontFamily: 'sans-serif',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            Fale Conosco
          </div>
          <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.3)' }} />
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.9)',
              fontFamily: 'sans-serif',
              textAlign: 'center',
            }}
          >
            (11) 9 9999-0000
          </div>
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

      {/* Bottom colophon strip */}
      <div
        style={{
          height: 18,
          background: '#f0ede0',
          borderTop: '1px solid #d0cfc0',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: 14,
          gap: 10,
        }}
      >
        <div style={{ fontSize: 7.5, color: '#bbb', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
          Anúncio comercial — {brand.toUpperCase()}
        </div>
        <div style={{ flex: 1, height: 1, background: '#ddd' }} />
        <div style={{ fontSize: 7.5, color: '#ccc', fontFamily: 'sans-serif' }}>
          Rodapé 560×90px
        </div>
      </div>
    </div>
  );
};
