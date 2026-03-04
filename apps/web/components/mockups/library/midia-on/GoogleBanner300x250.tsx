'use client';

import React, { useState } from 'react';

interface GoogleBanner300x250Props {
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

export const GoogleBanner300x250: React.FC<GoogleBanner300x250Props> = ({
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
  brandColor,
  brandName,
}) => {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  const resolvedBrand = brandName ?? name ?? username ?? 'Minha Marca';
  const resolvedHeadline = headline ?? title ?? 'Solução Completa para Seu Negócio';
  const resolvedDesc = body ?? caption ?? description ?? text ?? 'Experimente grátis por 30 dias. Sem cartão de crédito.';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedLogo = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1a73e8';

  return (
    <div style={{
      width: 300,
      height: 250,
      background: '#fff',
      border: '1px solid #dadce0',
      borderRadius: 4,
      overflow: 'hidden',
      fontFamily: 'Google Sans, Arial, sans-serif',
      position: 'relative',
      boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.10)',
      transition: 'box-shadow 0.2s',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <style>{`
        @keyframes ggl-300x250-shine {
          0% { transform: translateX(-100%); }
          60%, 100% { transform: translateX(200%); }
        }
        .ggl-300x250-shine::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
          animation: ggl-300x250-shine 2.5s ease-in-out infinite;
          pointer-events: none;
        }
        .ggl-300x250-cta:hover { filter: brightness(0.92); }
      `}</style>

      {/* Ad label */}
      <div style={{
        position: 'absolute', top: 6, left: 8, zIndex: 10,
        fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.55)',
        borderRadius: 3, padding: '1px 5px', fontWeight: 600, letterSpacing: 0.3,
      }}>
        Anúncio
      </div>

      {/* Image area */}
      <div
        className="ggl-300x250-shine"
        style={{
          height: 150, width: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0,
          background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${resolvedColor}22 0%, ${resolvedColor}55 100%)`,
        }}
      >
        {resolvedImage
          ? <img src={resolvedImage} alt={resolvedHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={resolvedColor} strokeWidth="1.2" style={{ opacity: 0.4 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )
        }
        {/* Decorative brand stripe */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: resolvedColor }} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: '10px 12px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {resolvedLogo
            ? <img src={resolvedLogo} alt={resolvedBrand} style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
            : (
              <div style={{ width: 20, height: 20, borderRadius: 3, background: resolvedColor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{resolvedBrand.charAt(0)}</span>
              </div>
            )
          }
          <span style={{ fontSize: 11, color: '#5f6368', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolvedBrand}</span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#202124', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {resolvedHeadline}
        </div>

        {/* Description */}
        <div style={{ fontSize: 11, color: '#5f6368', lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {resolvedDesc}
        </div>

        {/* CTA button */}
        <button
          type="button"
          aria-label="Saiba mais"
          className="ggl-300x250-cta"
          onClick={() => setClicked(true)}
          style={{
            width: '100%', background: clicked ? '#1557b0' : resolvedColor,
            color: '#fff', border: 'none', borderRadius: 4,
            padding: '7px 0', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'filter 0.15s, background 0.15s',
          }}
        >
          {clicked ? 'Redirecionando…' : 'Saiba mais'}
        </button>
      </div>
    </div>
  );
};
