'use client';

import React from 'react';

interface MetroPlataformaProps {
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

export const MetroPlataforma: React.FC<MetroPlataformaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#9900cc',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Pilar de Plataforma';
  const resolvedBody = body ?? caption ?? description ?? 'Wrap 360° no pilar da estação';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0a0a16', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '380px' }}>

        {/* Station ceiling */}
        <div style={{
          width: '380px',
          height: '60px',
          background: '#080810',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 37px, rgba(255,255,255,0.04) 37px, rgba(255,255,255,0.04) 38px)',
          }} />
          {[50, 160, 270, 340].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '6px',
              left: `${x}px`,
              width: '36px',
              height: '5px',
              background: 'rgba(255,255,200,0.5)',
              borderRadius: '2px',
              boxShadow: '0 0 10px 3px rgba(255,255,200,0.2)',
            }} />
          ))}
          <div style={{
            width: '100%',
            height: '14px',
            background: brandColor,
            opacity: 0.8,
          }} />
        </div>

        {/* Platform scene */}
        <div style={{
          width: '380px',
          height: '280px',
          background: '#0d0d20',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Wall tiles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(255,255,255,0.025) 29px, rgba(255,255,255,0.025) 30px), repeating-linear-gradient(180deg, transparent, transparent 29px, rgba(255,255,255,0.025) 29px, rgba(255,255,255,0.025) 30px)',
          }} />

          {/* Pillar wrap — cylindrical representation */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0' }}>
            {/* Left curved edge (shadow) */}
            <div style={{
              width: '18px',
              height: '240px',
              background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)',
              borderRadius: '50% 0 0 50%',
              border: '2px solid #333',
              borderRight: 'none',
              flexShrink: 0,
            }} />

            {/* Main pillar face */}
            <div style={{
              width: '120px',
              height: '240px',
              background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor}ee 0%, #220044 60%, ${brandColor}99 100%)`,
              border: '2px solid #333',
              borderLeft: 'none',
              borderRight: 'none',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Wrap pilar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '-30px',
                    width: '130px',
                    height: '130px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 8px',
                background: resolvedImage ? 'rgba(0,0,0,0.4)' : 'none',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '900',
                  color: '#fff',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  marginBottom: '8px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.75)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  marginBottom: '12px',
                }}>
                  {resolvedBody}
                </div>
                <div style={{
                  background: '#fff',
                  color: brandColor,
                  fontSize: '9px',
                  fontWeight: '900',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>

            {/* Right curved edge (highlight) */}
            <div style={{
              width: '18px',
              height: '240px',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.5) 100%)',
              borderRadius: '0 50% 50% 0',
              border: '2px solid #333',
              borderLeft: 'none',
              flexShrink: 0,
            }} />
          </div>

          {/* 360° wrap indicator arrows */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <div style={{ color: brandColor, fontSize: '16px', fontWeight: '700' }}>←</div>
            <div style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '600',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              360° Wrap
            </div>
            <div style={{ color: brandColor, fontSize: '16px', fontWeight: '700' }}>→</div>
          </div>

          {/* Circle top indicator */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60px',
            height: '30px',
            border: `2px solid ${brandColor}66`,
            borderBottom: 'none',
            borderRadius: '50% 50% 0 0',
            marginTop: '12px',
          }} />
        </div>

        {/* Platform edge */}
        <div style={{
          width: '380px',
          height: '6px',
          background: `repeating-linear-gradient(90deg, ${brandColor} 0px, ${brandColor} 14px, #ffcc00 14px, #ffcc00 28px)`,
        }} />
        <div style={{
          width: '380px',
          height: '16px',
          background: '#1a1a1a',
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
          Pilar 360°
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
          Metrô Plataforma — Pilar Envelopado 360° · Wrap Cilíndrico
        </div>
      </div>
    </div>
  );
};
