'use client';

import React from 'react';

interface JornalIlhoteProps {
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

export const JornalIlhote: React.FC<JornalIlhoteProps> = ({
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
  const mainHeadline = headline ?? title ?? 'Oferta especial para você';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Não perca esta oportunidade única com condições absolutamente imperdíveis para quem age agora.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 280,
        background: '#faf9f5',
        fontFamily: '"Georgia", "Times New Roman", serif',
        border: '2px solid #222',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes jilh-pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .jilh-pop { animation: jilh-pop 0.45s ease both; }
        @keyframes jilh-btn { 0%,100%{opacity:1} 50%{opacity:0.82} }
        .jilh-btn { animation: jilh-btn 2.5s ease infinite; }
      `}</style>

      {/* Top brand bar */}
      <div
        style={{
          background: brandColor,
          padding: '7px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
        className="jilh-pop"
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {brand}
        </span>
        <span
          style={{
            fontSize: 7,
            color: 'rgba(255,255,255,0.65)',
            fontFamily: 'sans-serif',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          Publicidade
        </span>
      </div>

      {/* Product image */}
      <div
        style={{
          width: '100%',
          height: 120,
          background: '#ccc9b8',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
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
              background: 'linear-gradient(135deg,#d0cdc0 0%,#a8a59a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 8.5, color: '#888', fontFamily: 'sans-serif' }}>Produto</span>
          </div>
        )}
      </div>

      {/* Offer price badge strip */}
      <div
        style={{
          background: '#fff8ee',
          borderBottom: `2px solid ${brandColor}`,
          padding: '5px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 8, color: '#999', fontFamily: 'sans-serif', textDecoration: 'line-through' }}>
          R$ 199,90
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: brandColor, lineHeight: 1 }}>
          R$ 149,90
        </div>
        <div
          style={{
            background: '#e53e3e',
            color: '#fff',
            fontSize: 7.5,
            fontFamily: 'sans-serif',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 2,
          }}
        >
          -25%
        </div>
      </div>

      {/* Body copy */}
      <div
        style={{
          flex: 1,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ width: 22, height: 3, background: brandColor, marginBottom: 6 }} />
          <h2
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.3,
              margin: '0 0 7px',
              letterSpacing: -0.2,
            }}
          >
            {mainHeadline}
          </h2>
          <p style={{ fontSize: 9.5, color: '#444', lineHeight: 1.6, margin: 0 }}>
            {bodyText}
          </p>
        </div>

        {/* Contact + CTA */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 9,
            borderTop: '1px solid #d0cfc0',
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 8.5, color: '#666', fontFamily: 'sans-serif' }}>
            (11) 9 9999-0000
          </span>
          <button
            type="button"
            aria-label={`Ver oferta de ${brand}`}
            style={{
              background: brandColor,
              border: 'none',
              padding: '4px 10px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
            className="jilh-btn"
          >
            <span style={{ fontSize: 8.5, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700 }}>
              Ver oferta
            </span>
          </button>
        </div>
      </div>

      {/* Bottom label */}
      <div
        style={{
          background: '#111',
          padding: '4px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>
          Ilhote 280×280px
        </span>
        <span style={{ fontSize: 8, color: '#aaa', fontFamily: 'sans-serif' }}>
          {brand.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
