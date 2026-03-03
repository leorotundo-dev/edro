'use client';

import React from 'react';

interface MetroTunelProps {
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

export const MetroTunel: React.FC<MetroTunelProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#ff6600',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Parede do Túnel';
  const resolvedBody = body ?? caption ?? description ?? 'Vista durante a viagem no trilho';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#050508', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '460px' }}>

        {/* Tunnel scene */}
        <div style={{
          width: '460px',
          height: '300px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
        }}>
          {/* Tunnel arch shape */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #0a0a10 0%, #050508 100%)',
          }} />

          {/* Curved wall silhouette */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: '#0e0e1a',
            borderRadius: '0 0 60% 60%',
            border: '3px solid #1a1a28',
          }} />

          {/* Tunnel concentric arches */}
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${-20 + i * 15}px`,
              left: `${-20 + i * 20}px`,
              right: `${-20 + i * 20}px`,
              height: `${200 - i * 20}px`,
              border: '2px solid rgba(255,255,255,0.04)',
              borderRadius: '0 0 50% 50%',
            }} />
          ))}

          {/* Track rails perspective */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
          }}>
            {/* Rail bed */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '16px', background: '#1a1814' }} />
            {/* Left rail */}
            <svg style={{ position: 'absolute', inset: 0 }} width="460" height="120">
              <path d="M 190,120 L 210,0" stroke="#555" strokeWidth="4" />
              <path d="M 270,120 L 250,0" stroke="#555" strokeWidth="4" />
              {/* Sleepers */}
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={185 + i * 3} y={20 + i * 20} width={90 - i * 6} height="5" fill="#333" rx="1" />
              ))}
            </svg>

            {/* Distant light at end of tunnel */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,200,0.8) 0%, transparent 70%)',
              boxShadow: '0 0 20px 10px rgba(255,255,200,0.15)',
            }} />
          </div>

          {/* Wall poster — motion blur treatment */}
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '0',
            right: '0',
            height: '140px',
            overflow: 'hidden',
          }}>
            {/* Left motion fade */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '80px',
              height: '100%',
              background: 'linear-gradient(90deg, #050508 0%, transparent 100%)',
              zIndex: 3,
              pointerEvents: 'none',
            }} />
            {/* Right motion fade */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '80px',
              height: '100%',
              background: 'linear-gradient(270deg, #050508 0%, transparent 100%)',
              zIndex: 3,
              pointerEvents: 'none',
            }} />

            {/* Poster area */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '60px',
              right: '60px',
              height: '100px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #0a0010 0%, ${brandColor}cc 50%, #1a0000 100%)`,
              overflow: 'hidden',
              border: `2px solid ${brandColor}44`,
              borderRadius: '2px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Parede túnel" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(0.5px)' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 10px)`,
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 60%)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: `0 0 14px ${brandColor}66, 0 2px 8px rgba(0,0,0,0.8)`,
                    maxWidth: '220px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.75)',
                    marginTop: '6px',
                    fontWeight: '400',
                  }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '900',
                  padding: '8px 12px',
                  borderRadius: '3px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: `0 0 14px ${brandColor}88`,
                }}>
                  {resolvedBrand}
                </div>
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
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 10,
          boxShadow: `0 0 10px ${brandColor}88`,
        }}>
          Túnel Metrô
        </div>

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#888',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Metrô Túnel — Painel Vinílico na Parede do Túnel · Motion Blur
        </div>
      </div>
    </div>
  );
};
