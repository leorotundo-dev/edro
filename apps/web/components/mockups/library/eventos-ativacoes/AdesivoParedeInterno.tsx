'use client';

import React, { useState } from 'react';

interface AdesivoParedeInternoProps {
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

export const AdesivoParedeInterno: React.FC<AdesivoParedeInternoProps> = ({
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
  brandColor = '#2563EB',
  brandName,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Bem-vindo!';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Experimente nossos produtos e descubra o que há de melhor para você';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const [peeled, setPeeled] = useState(false);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '28px', background: '#e8e4df', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes adeint-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .adeint-shimmer { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%); background-size:200% 100%; animation: adeint-shimmer 3s linear infinite; }
      `}</style>

      <div style={{ position: 'relative', width: '340px' }}>
        {/* Indoor wall — painted surface */}
        <div style={{
          width: '340px',
          height: '460px',
          background: 'linear-gradient(160deg, #f2ede8 0%, #e8e2db 100%)',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 2px 2px 12px rgba(0,0,0,0.08)',
        }}>
          {/* Subtle wall texture */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.025) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }} />

          {/* Baseboard */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '28px',
            background: '#d6d0c8',
            borderTop: '2px solid #c8c2b8',
          }} />

          {/* The sticker panel */}
          <div
            onClick={() => setPeeled(p => !p)}
            style={{
              position: 'absolute',
              top: '55px',
              left: '25px',
              width: '290px',
              height: '320px',
              background: resolvedImage
                ? 'transparent'
                : `linear-gradient(145deg, ${brandColor} 0%, ${brandColor}bb 70%, #0a0a2a 100%)`,
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '3px 5px 18px rgba(0,0,0,0.28)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              transform: peeled ? 'perspective(600px) rotateY(2deg)' : 'none',
            }}
          >
            {resolvedImage && (
              <img src={resolvedImage} alt="Adesivo interno" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            )}
            <div className="adeint-shimmer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: '6px',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '24px 22px',
              background: resolvedImage ? 'rgba(0,0,0,0.42)' : 'none',
            }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '10px',
              }}>
                {resolvedBrand}
              </div>
              <div style={{
                fontSize: '26px',
                fontWeight: '900',
                color: '#fff',
                lineHeight: 1.15,
                textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                marginBottom: '12px',
              }}>
                {resolvedHeadline}
              </div>
              <div style={{
                width: '40px',
                height: '3px',
                background: 'rgba(255,255,255,0.6)',
                marginBottom: '14px',
                borderRadius: '2px',
              }} />
              <div style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.6,
                marginBottom: '20px',
              }}>
                {resolvedBody}
              </div>
              {/* QR placeholder */}
              <div style={{
                width: '48px',
                height: '48px',
                background: '#fff',
                borderRadius: '4px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5,1fr)',
                  gap: '1px',
                }}>
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} style={{
                      background: [0,1,2,5,10,12,14,20,22,23,24,6,7,8,17,19].includes(i) ? '#111' : 'transparent',
                      borderRadius: '1px',
                    }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '2px',
            }}>
              60×90cm
            </div>
            {/* Peel corner — bottom right */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: `0 0 ${peeled ? 44 : 28}px ${peeled ? 44 : 28}px`,
              borderColor: `transparent transparent #e8e2db transparent`,
              transition: 'border-width 0.25s ease',
              filter: 'drop-shadow(-1px -1px 2px rgba(0,0,0,0.25))',
            }} />
          </div>

          {/* Format badge */}
          <div style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: brandColor,
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            padding: '4px 9px',
            borderRadius: '3px',
          }}>
            Adesivo Parede Interna
          </div>

          <div style={{
            position: 'absolute',
            bottom: '36px',
            right: '14px',
            fontSize: '10px',
            color: '#9a948e',
            fontStyle: 'italic',
          }}>
            {peeled ? 'clique para colar' : 'clique para descolar'}
          </div>
        </div>

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Adesivo Parede Interna · 60×90cm · Acabamento fosco
        </div>
      </div>
    </div>
  );
};
