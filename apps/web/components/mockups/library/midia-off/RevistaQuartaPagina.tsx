'use client';

import React from 'react';

interface RevistaQuartaPaginaProps {
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

export const RevistaQuartaPagina: React.FC<RevistaQuartaPaginaProps> = ({
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
  brandColor = '#e67e22',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Oferta especial para leitores';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Anúncio horizontal de ¼ de página — formato faixa econômico e eficiente.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 340,
        height: 110,
        background: '#f8f8f4',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch',
        border: `1px solid #e0e0d8`,
        borderLeft: `5px solid ${brandColor}`,
      }}
    >
      <style>{`
        @keyframes rqp-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        .rqp-in { animation: rqp-in 0.4s ease both; }
        @keyframes rqp-pulse { 0%,100%{opacity:1} 50%{opacity:0.82} }
        .rqp-cta { animation: rqp-pulse 2.2s ease infinite; }
      `}</style>

      {/* Brand block */}
      <div
        style={{
          width: 90,
          background: '#111',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          flexShrink: 0,
        }}
        className="rqp-in"
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: -0.2,
          }}
        >
          {brand}
        </div>
        <div style={{ width: 20, height: 2, background: brandColor, marginTop: 4 }} />
        <div
          style={{
            fontSize: 6.5,
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'sans-serif',
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          ¼ página
        </div>
      </div>

      {/* Optional image */}
      {heroImage && (
        <div style={{ width: 80, flexShrink: 0, overflow: 'hidden' }}>
          <img
            src={heroImage}
            alt={mainHeadline}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Copy */}
      <div
        style={{
          flex: 1,
          padding: '0 14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 7,
            fontFamily: 'sans-serif',
            color: brandColor,
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontWeight: 700,
          }}
        >
          Publicidade
        </div>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: '#111',
            lineHeight: 1.2,
            margin: 0,
            letterSpacing: -0.2,
          }}
        >
          {mainHeadline}
        </h2>
        <p style={{ fontSize: 8.5, color: '#555', margin: 0, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
          {bodyText}
        </p>
      </div>

      {/* CTA */}
      <div
        style={{
          width: 80,
          background: brandColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          flexShrink: 0,
          gap: 4,
        }}
        className="rqp-cta"
      >
        <div
          style={{
            fontSize: 9.5,
            color: '#fff',
            fontFamily: 'sans-serif',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          Acesse já!
        </div>
        <div
          style={{
            fontSize: 7.5,
            color: 'rgba(255,255,255,0.7)',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}
        >
          (11) 9 9999-0000
        </div>
      </div>
    </div>
  );
};
