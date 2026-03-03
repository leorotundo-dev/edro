'use client';

import React from 'react';

interface RevistaQuartaCapaProps {
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

export const RevistaQuartaCapa: React.FC<RevistaQuartaCapaProps> = ({
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
  brandColor = '#c0392b',
}) => {
  const brand = brandName ?? name ?? 'Marca Premium';
  const mainHeadline = headline ?? title ?? 'A última impressão é a que fica';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Contracapa externa — o espaço mais visível e desejado de toda a publicação. Feche com a sua marca.';
  const coverImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 340,
        height: 454,
        background: '#111',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes rq4-in { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }
        .rq4-in { animation: rq4-in 0.6s ease both; }
        @keyframes rq4-shine { 0%,100%{opacity:0.06} 50%{opacity:0.13} }
        .rq4-shine { animation: rq4-shine 4s ease infinite; }
      `}</style>

      {/* Full-bleed background */}
      <div style={{ position: 'absolute', inset: 0 }} className="rq4-in">
        {coverImage ? (
          <img
            src={coverImage}
            alt={mainHeadline}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(160deg, ${brandColor}44 0%, #111 55%)`,
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.72) 60%, rgba(0,0,0,0.95) 100%)',
          }}
        />
        <div
          className="rq4-shine"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(120deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Top label */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '14px 18px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: 'sans-serif',
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          4ª Capa
        </span>
        <div style={{ background: brandColor, padding: '3px 10px' }}>
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
            Contracapa
          </span>
        </div>
      </div>

      {/* Centred brand + icon */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -2,
            lineHeight: 1,
            textTransform: 'uppercase',
            textShadow: '0 2px 18px rgba(0,0,0,0.6)',
          }}
        >
          {brand}
        </div>
        <div style={{ width: 60, height: 4, background: brandColor, margin: '16px auto' }} />
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: `2px solid ${brandColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      {/* Bottom copy */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '18px 20px 20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.2,
            margin: '0 0 8px',
            letterSpacing: -0.3,
          }}
        >
          {mainHeadline}
        </h2>
        <p
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.55,
            margin: '0 0 14px',
            fontFamily: 'sans-serif',
          }}
        >
          {bodyText}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ border: `1px solid ${brandColor}`, padding: '6px 16px', display: 'inline-block' }}>
            <span
              style={{
                fontSize: 9,
                color: brandColor,
                fontFamily: 'sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              Saiba mais
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>
              (11) 9 9999-0000
            </div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.32)', fontFamily: 'sans-serif', marginTop: 2 }}>
              www.{brand.toLowerCase().replace(/\s/g, '')}.com.br
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
