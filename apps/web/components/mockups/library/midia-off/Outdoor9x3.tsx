'use client';

import React from 'react';

interface Outdoor9x3Props {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  caption?: string;
  description?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  brandColor?: string;
  brandName?: string;
  username?: string;
}

export const Outdoor9x3: React.FC<Outdoor9x3Props> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#e63329',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Sua Mensagem Aqui';
  const resolvedBody = body ?? caption ?? description ?? 'Chamada para ação ou slogan da campanha';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#e8eaf0', display: 'inline-block' }}>
      <style>{`
        @keyframes outdoor9x3-clouds {
          0% { transform: translateX(0); }
          100% { transform: translateX(60px); }
        }
      `}</style>

      {/* Scene container */}
      <div style={{ position: 'relative', width: '520px' }}>

        {/* Sky background */}
        <div style={{
          width: '520px',
          height: '200px',
          background: 'linear-gradient(180deg, #87CEEB 0%, #b8e0f5 60%, #d4ecf7 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated clouds */}
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '40px',
            width: '80px',
            height: '28px',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: '20px',
            animation: 'outdoor9x3-clouds 8s linear infinite',
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '200px',
            width: '60px',
            height: '22px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '16px',
            animation: 'outdoor9x3-clouds 12s linear infinite',
          }} />
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '350px',
            width: '70px',
            height: '24px',
            background: 'rgba(255,255,255,0.75)',
            borderRadius: '18px',
            animation: 'outdoor9x3-clouds 10s linear infinite reverse',
          }} />

          {/* Ground strip */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '40px',
            background: 'linear-gradient(180deg, #8BC34A 0%, #558B2F 100%)',
          }} />

          {/* Road strip */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '18px',
            background: '#555',
          }} />
          {/* Road dashes */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '6px',
              left: `${40 + i * 80}px`,
              width: '40px',
              height: '4px',
              background: '#fff',
              borderRadius: '2px',
            }} />
          ))}

          {/* Billboard structure - B-pole */}
          <div style={{
            position: 'absolute',
            bottom: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* B-structure horizontal beam */}
            <div style={{
              width: '440px',
              height: '8px',
              background: '#4a4a4a',
              borderRadius: '2px',
            }} />
            {/* Left leg */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '80px',
              width: '12px',
              height: '70px',
              background: '#3a3a3a',
            }} />
            {/* Right leg */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '80px',
              width: '12px',
              height: '70px',
              background: '#3a3a3a',
            }} />
          </div>
        </div>

        {/* Billboard frame */}
        <div style={{
          width: '520px',
          background: '#2a2a2a',
          padding: '6px',
          border: '3px solid #1a1a1a',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          marginTop: '-100px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Ad panel 420x140 */}
          <div style={{
            width: '100%',
            height: '140px',
            position: 'relative',
            overflow: 'hidden',
            background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #1a1a2e 100%)`,
            borderRadius: '2px',
          }}>
            {resolvedImage && (
              <img src={resolvedImage} alt="Anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {!resolvedImage && (
              <>
                {/* Decorative shapes */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '30%',
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                }} />
              </>
            )}
            {/* Overlay content */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, transparent 60%)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  letterSpacing: '-0.5px',
                  maxWidth: '280px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: '6px',
                  fontWeight: '600',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>
                  {resolvedBody}
                </div>
              </div>
              <div style={{
                background: brandColor,
                color: '#fff',
                fontWeight: '900',
                fontSize: '13px',
                padding: '8px 14px',
                borderRadius: '4px',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                {resolvedBrand}
              </div>
            </div>
          </div>
        </div>

        {/* Dimension badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: brandColor,
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          letterSpacing: '0.5px',
        }}>
          9×3m
        </div>

        {/* Format label */}
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Outdoor Rodoviário — Painel 420×140px (repr.)
        </div>
      </div>
    </div>
  );
};
