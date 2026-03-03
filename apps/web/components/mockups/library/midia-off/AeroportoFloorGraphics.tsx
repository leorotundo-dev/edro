'use client';

import React from 'react';

interface AeroportoFloorGraphicsProps {
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

export const AeroportoFloorGraphics: React.FC<AeroportoFloorGraphicsProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#006699',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Siga em Frente';
  const resolvedBody = body ?? caption ?? description ?? 'Cada passo com a melhor marca';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8bcc4', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '420px' }}>

        {/* Looking-down floor perspective view */}
        <div style={{
          width: '420px',
          height: '380px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          background: '#c8ccd4',
        }}>
          {/* Floor perspective transform */}
          <div style={{
            position: 'absolute',
            inset: 0,
            perspective: '500px',
            display: 'flex',
            alignItems: 'flex-end',
          }}>
            {/* Floor surface */}
            <div style={{
              width: '100%',
              height: '380px',
              background: '#e0e4e8',
              transform: 'perspective(600px) rotateX(25deg)',
              transformOrigin: 'bottom center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Floor tile grid */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 60px),
                  repeating-linear-gradient(180deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 60px)
                `,
              }} />

              {/* Brand floor graphic (large vinyl) */}
              <div style={{
                position: 'absolute',
                top: '40px',
                left: '40px',
                right: '40px',
                height: '260px',
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 50%, ${brandColor}22 100%)`,
                border: `3px solid ${brandColor}`,
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Floor graphic" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                ) : null}

                {/* Brand logo area */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '36px',
                    fontWeight: '900',
                    color: brandColor,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }}>
                    {resolvedBrand}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: brandColor,
                    fontWeight: '600',
                    marginTop: '4px',
                    opacity: 0.8,
                  }}>
                    {resolvedHeadline}
                  </div>
                </div>

                {/* Directional arrows */}
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      fontSize: '28px',
                      color: brandColor,
                      fontWeight: '900',
                      opacity: 0.4 + i * 0.2,
                    }}>
                      ↑
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footprint icons */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '30px',
          }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {/* Left foot */}
                <div style={{
                  width: '16px',
                  height: '24px',
                  background: brandColor,
                  borderRadius: '8px 8px 4px 4px',
                  opacity: 0.3 + i * 0.08,
                  transform: `rotate(${i % 2 === 0 ? -10 : 10}deg)`,
                  marginLeft: i % 2 === 0 ? 0 : '20px',
                }} />
              </div>
            ))}
          </div>

          {/* Border/edge of vinyl */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '12px',
            background: brandColor,
            opacity: 0.15,
          }} />
        </div>

        {/* Info strip */}
        <div style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: '#fff',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#111' }}>{resolvedHeadline}</div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{resolvedBody}</div>
          </div>
          <div style={{
            background: brandColor,
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            padding: '6px 12px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {resolvedBrand}
          </div>
        </div>

        {/* Format badge */}
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
        }}>
          Floor Graphics
        </div>

        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#555',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Aeroporto Floor Graphics — Vinílico no Piso · Perspectiva
        </div>
      </div>
    </div>
  );
};
