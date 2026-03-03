'use client';

import React from 'react';

interface MetroPainelProps {
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

export const MetroPainel: React.FC<MetroPainelProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#e60026',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Painel de Plataforma';
  const resolvedBody = body ?? caption ?? description ?? 'Alcance passageiros no momento da espera';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0d0d18', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '520px' }}>

        {/* Station wall and ceiling context */}
        <div style={{
          width: '520px',
          height: '70px',
          background: '#0a0a14',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ceiling tiles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 51px, rgba(255,255,255,0.04) 51px, rgba(255,255,255,0.04) 52px)',
          }} />
          {/* Lights */}
          {[60, 180, 310, 430].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '8px',
              left: `${x}px`,
              width: '50px',
              height: '7px',
              background: 'rgba(255,250,210,0.55)',
              borderRadius: '2px',
              boxShadow: '0 0 14px 5px rgba(255,250,210,0.2)',
            }} />
          ))}

          {/* Station indicator strip */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '18px',
            background: brandColor,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '16px',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#fff',
              flexShrink: 0,
            }} />
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: '900', letterSpacing: '1.5px' }}>
              LINHA 3 — VERMELHA
            </div>
          </div>
        </div>

        {/* Platform wall */}
        <div style={{
          width: '520px',
          background: '#0d1020',
          position: 'relative',
          padding: '16px 14px',
        }}>
          {/* Wall tile pattern */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255,255,255,0.02) 49px, rgba(255,255,255,0.02) 50px), repeating-linear-gradient(180deg, transparent, transparent 49px, rgba(255,255,255,0.02) 49px, rgba(255,255,255,0.02) 50px)',
          }} />

          {/* Wide horizontal panel 500x120 */}
          <div style={{
            width: '100%',
            background: '#1a1a2e',
            border: '4px solid #252535',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}>
            {/* Ad panel */}
            <div style={{
              width: '100%',
              height: '120px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #0a0010 0%, ${brandColor}aa 50%, #1a0020 100%)`,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Painel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '30%',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, transparent 60%)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    maxWidth: '280px',
                    letterSpacing: '-0.5px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: '8px',
                    fontWeight: '400',
                    lineHeight: 1.4,
                  }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '13px',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: `0 2px 12px ${brandColor}66`,
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* Passenger silhouettes */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '14px',
            alignItems: 'flex-end',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0',
                opacity: 0.4 + i * 0.06,
              }}>
                {/* Head */}
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#666',
                }} />
                {/* Body */}
                <div style={{
                  width: '14px',
                  height: `${24 + (i % 3) * 4}px`,
                  background: '#555',
                  borderRadius: '2px 2px 0 0',
                  marginTop: '1px',
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Platform edge indicator line */}
        <div style={{
          width: '520px',
          height: '6px',
          background: `repeating-linear-gradient(90deg, ${brandColor} 0px, ${brandColor} 16px, #ffcc00 16px, #ffcc00 32px)`,
        }} />

        {/* Platform floor */}
        <div style={{
          width: '520px',
          height: '20px',
          background: '#222',
          borderRadius: '0 0 8px 8px',
        }} />

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
          Painel Metrô 500×120
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
          Metrô Painel — Painel Horizontal de Plataforma · 500×120cm
        </div>
      </div>
    </div>
  );
};
