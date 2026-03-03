'use client';

import React from 'react';

interface OutdoorBackLightProps {
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

export const OutdoorBackLight: React.FC<OutdoorBackLightProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#00c9ff',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Brilhe na Noite';
  const resolvedBody = body ?? caption ?? description ?? 'Visibilidade 24 horas por dia';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0a0a1a', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes backlight-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes backlight-stars {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>

      <div style={{ position: 'relative', width: '480px' }}>

        {/* Night sky background */}
        <div style={{
          width: '480px',
          height: '180px',
          background: 'linear-gradient(180deg, #050510 0%, #0d0d2b 50%, #1a1a3e 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Stars */}
          {[
            { top: 15, left: 30 }, { top: 25, left: 80 }, { top: 10, left: 150 },
            { top: 40, left: 220 }, { top: 18, left: 300 }, { top: 35, left: 380 },
            { top: 8, left: 430 }, { top: 50, left: 120 }, { top: 60, left: 260 },
            { top: 20, left: 350 }, { top: 45, left: 460 }, { top: 30, left: 400 },
          ].map((star, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${star.top}px`,
              left: `${star.left}px`,
              width: i % 3 === 0 ? '3px' : '2px',
              height: i % 3 === 0 ? '3px' : '2px',
              background: '#fff',
              borderRadius: '50%',
              animation: `backlight-stars ${1.5 + (i % 3) * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}

          {/* City silhouette */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '70px',
            background: '#080820',
            clipPath: 'polygon(0 100%, 0 60%, 20px 60%, 20px 40%, 50px 40%, 50px 20%, 80px 20%, 80px 45%, 110px 45%, 110px 25%, 140px 25%, 140px 55%, 170px 55%, 170px 35%, 200px 35%, 200px 50%, 240px 50%, 240px 30%, 270px 30%, 270px 50%, 310px 50%, 310px 40%, 350px 40%, 350px 55%, 390px 55%, 390px 35%, 420px 35%, 420px 50%, 460px 50%, 460px 60%, 480px 60%, 480px 100%)',
          }} />

          {/* Street lights glow */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '60px',
            width: '4px',
            height: '55px',
            background: '#333',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '62px',
            left: '56px',
            width: '12px',
            height: '4px',
            background: '#333',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '62px',
            left: '60px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'rgba(255,220,100,0.3)',
            boxShadow: '0 0 12px 6px rgba(255,220,100,0.2)',
          }} />
        </div>

        {/* Backlit frame - glowing edges */}
        <div style={{
          width: '480px',
          background: '#111',
          padding: '8px',
          border: '4px solid #1a1a1a',
          borderRadius: '4px',
          boxShadow: `0 0 30px 8px ${brandColor}55, 0 0 60px 15px ${brandColor}22, 0 4px 20px rgba(0,0,0,0.8)`,
          marginTop: '-80px',
          position: 'relative',
          zIndex: 2,
          animation: 'backlight-pulse 3s ease-in-out infinite',
        }}>
          {/* Glowing edge strips */}
          <div style={{
            position: 'absolute',
            inset: '2px',
            border: `2px solid ${brandColor}88`,
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 5,
            boxShadow: `inset 0 0 15px ${brandColor}33`,
          }} />

          {/* Ad panel */}
          <div style={{
            width: '100%',
            height: '140px',
            position: 'relative',
            overflow: 'hidden',
            background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #0d0d2b 0%, #1a0050 50%, ${brandColor}22 100%)`,
            borderRadius: '2px',
          }}>
            {resolvedImage ? (
              <img src={resolvedImage} alt="Anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                {/* Neon geometric decoration */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '30px',
                  width: '80px',
                  height: '80px',
                  border: `2px solid ${brandColor}66`,
                  borderRadius: '4px',
                  transform: 'rotate(20deg)',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '30px',
                  right: '40px',
                  width: '60px',
                  height: '60px',
                  border: `2px solid ${brandColor}44`,
                  borderRadius: '4px',
                  transform: 'rotate(35deg)',
                }} />
              </>
            )}

            {/* Content overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 70%)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: `0 0 20px ${brandColor}, 0 2px 8px rgba(0,0,0,0.8)`,
                  letterSpacing: '-0.5px',
                  maxWidth: '260px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: brandColor,
                  marginTop: '8px',
                  fontWeight: '600',
                  textShadow: `0 0 10px ${brandColor}`,
                  letterSpacing: '0.5px',
                }}>
                  {resolvedBody}
                </div>
              </div>

              <div style={{
                background: `linear-gradient(135deg, ${brandColor} 0%, #0066ff 100%)`,
                color: '#fff',
                fontWeight: '900',
                fontSize: '12px',
                padding: '10px 14px',
                borderRadius: '4px',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: `0 0 20px ${brandColor}88`,
              }}>
                {resolvedBrand}
              </div>
            </div>
          </div>
        </div>

        {/* Format badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: brandColor,
          color: '#000',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 10,
          boxShadow: `0 0 12px ${brandColor}`,
          letterSpacing: '0.5px',
        }}>
          Back-Light 9×3m
        </div>

        {/* Format label */}
        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Outdoor Backlight — Iluminação Interna · 24h
        </div>
      </div>
    </div>
  );
};
