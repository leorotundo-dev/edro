'use client';

import React, { useState } from 'react';

interface AdesivoParedeExternoProps {
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

export const AdesivoParedeExterno: React.FC<AdesivoParedeExternoProps> = ({
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
  brandColor = '#E63946',
  brandName,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Grande Promoção!';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Aproveite as melhores ofertas desta temporada com descontos imperdíveis';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '32px', background: '#d0cfc8', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes adext-pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes adext-peel { 0%{transform:rotate(0deg)} 100%{transform:rotate(-8deg)} }
        .adext-badge { animation: adext-pulse 2.5s ease-in-out infinite; }
        .adext-hovered { animation: adext-peel 0.3s ease forwards; }
      `}</style>

      {/* Wall background context */}
      <div style={{ position: 'relative', width: '360px' }}>
        {/* Exterior wall texture */}
        <div style={{
          width: '360px',
          height: '480px',
          background: '#c4bdb2',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.15)',
        }}>
          {/* Brick texture lines horizontal */}
          {[60, 120, 180, 240, 300, 360, 420].map((y, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${y}px`,
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(0,0,0,0.08)',
            }} />
          ))}
          {/* Brick vertical offsets */}
          {[30, 90, 150, 210, 270, 330].map((y, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${y}px`,
              left: `${(i % 2) === 0 ? 90 : 0}px`,
              width: '1px',
              height: '60px',
              background: 'rgba(0,0,0,0.07)',
            }} />
          ))}

          {/* The sticker itself */}
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'absolute',
              top: '60px',
              left: '30px',
              width: '300px',
              height: '340px',
              background: resolvedImage
                ? 'transparent'
                : `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 60%, #111 100%)`,
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: hovered
                ? '6px 6px 20px rgba(0,0,0,0.5), -2px -2px 8px rgba(0,0,0,0.2)'
                : '4px 4px 14px rgba(0,0,0,0.4)',
              transition: 'box-shadow 0.2s ease',
              cursor: 'pointer',
            }}
          >
            {resolvedImage && (
              <img src={resolvedImage} alt="Adesivo" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            )}

            {/* Adhesive edge border indicator */}
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '3px dashed rgba(255,255,255,0.25)',
              borderRadius: '4px',
              pointerEvents: 'none',
            }} />

            {/* Content overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              padding: '28px 24px',
              background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
            }}>
              {/* Brand badge */}
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: '2px',
                marginBottom: '14px',
              }}>
                {resolvedBrand}
              </div>

              {/* Headline */}
              <div style={{
                fontSize: '28px',
                fontWeight: '900',
                color: '#fff',
                lineHeight: 1.1,
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                marginBottom: '12px',
                maxWidth: '240px',
              }}>
                {resolvedHeadline}
              </div>

              {/* Body text */}
              <div style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.55,
                marginBottom: '20px',
                maxWidth: '220px',
              }}>
                {resolvedBody}
              </div>

              {/* CTA */}
              <div style={{
                background: '#fff',
                color: brandColor,
                fontSize: '12px',
                fontWeight: '900',
                padding: '8px 18px',
                borderRadius: '3px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
              }}>
                Saiba Mais
              </div>
            </div>

            {/* Dimension badge */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: '600',
              padding: '3px 7px',
              borderRadius: '2px',
            }}>
              100×120cm
            </div>

            {/* Peel corner triangle effect */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: '32px 32px 0 0',
              borderColor: `transparent #c4bdb2 transparent transparent`,
              filter: 'drop-shadow(1px -1px 2px rgba(0,0,0,0.3))',
            }} />
            {/* Peel shadow under corner */}
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              width: '24px',
              height: '24px',
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '0 4px 0 0',
              transform: 'rotate(-45deg)',
              transformOrigin: 'bottom left',
            }} />
          </div>

          {/* Format label outside sticker */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: brandColor,
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            padding: '4px 9px',
            borderRadius: '3px',
          }}
            className="adext-badge"
          >
            Adesivo Parede Externa
          </div>
        </div>

        {/* Ground / baseboard */}
        <div style={{
          width: '360px',
          height: '16px',
          background: '#a09890',
          borderRadius: '0 0 8px 8px',
        }} />

        {/* Caption */}
        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Adesivo Parede Externa · 100×120cm · Alta fixação
        </div>
      </div>
    </div>
  );
};
