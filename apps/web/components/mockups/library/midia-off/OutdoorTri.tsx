'use client';

import React from 'react';

interface OutdoorTriProps {
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

export const OutdoorTri: React.FC<OutdoorTriProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#1a73e8',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Tri-Visão';
  const resolvedBody = body ?? caption ?? description ?? 'Três anunciantes em rotação';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  // Three "faces" of tri-vision — different content slices
  const faces = [
    { bg: `linear-gradient(135deg, #1a3c6e 0%, ${brandColor} 100%)`, label: 'Face A', text: resolvedHeadline },
    { bg: 'linear-gradient(135deg, #2d6a2d 0%, #52b352 100%)', label: 'Face B', text: 'Próxima Rotação' },
    { bg: 'linear-gradient(135deg, #6e1a1a 0%, #d44 100%)', label: 'Face C', text: 'Outro Anunciante' },
  ];

  const slatsPerFace = 8;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c8d8e0', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes tri-rotate {
          0%, 30% { transform: rotateX(0deg); }
          35%, 65% { transform: rotateX(-120deg); }
          70%, 100% { transform: rotateX(-240deg); }
        }
      `}</style>

      <div style={{ position: 'relative', width: '500px' }}>

        {/* Sky background */}
        <div style={{
          width: '500px',
          height: '160px',
          background: 'linear-gradient(180deg, #7ab8d4 0%, #a8cfe0 60%, #c0dce8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25px', background: '#7a9a5a' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#5c7042' }} />
        </div>

        {/* Billboard structure */}
        <div style={{
          width: '500px',
          background: '#2a2a2a',
          padding: '6px',
          border: '4px solid #1a1a1a',
          borderRadius: '3px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          marginTop: '-75px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Panel area with tri-vision slats */}
          <div style={{
            width: '100%',
            height: '140px',
            position: 'relative',
            overflow: 'hidden',
            background: '#111',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Simulate tri-vision slats - each showing a fragment of the active face */}
            {Array.from({ length: slatsPerFace }).map((_, i) => {
              const slotHeight = 140 / slatsPerFace;
              const faceColors = [
                `linear-gradient(135deg, #1a3c6e ${i * 12}%, ${brandColor} 100%)`,
                `linear-gradient(135deg, #2d6a2d ${i * 12}%, #52b352 100%)`,
                `linear-gradient(135deg, #6e1a1a ${i * 12}%, #cc4444 100%)`,
              ];
              // Show face A (active), with slight offset per slat for realism
              const activeFace = i % 3 === 0 ? 0 : i % 3 === 1 ? 0 : 0;
              return (
                <div key={i} style={{
                  height: `${slotHeight}px`,
                  background: faceColors[activeFace],
                  borderBottom: i < slatsPerFace - 1 ? '1px solid rgba(0,0,0,0.5)' : 'none',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  transform: `skewX(${i % 2 === 0 ? 0.3 : -0.3}deg)`,
                  overflow: 'hidden',
                }}>
                  {/* Slat shadow at edges */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'rgba(0,0,0,0.3)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'rgba(0,0,0,0.3)',
                  }} />
                </div>
              );
            })}

            {/* Overlay text content on top of slats */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: resolvedImage ? 'none' : 'none',
            }}>
              {resolvedImage && (
                <img src={resolvedImage} alt="Anúncio" style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: 0.7,
                }} />
              )}
              <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  maxWidth: '250px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: '6px',
                  fontWeight: '500',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}>
                  {resolvedBody}
                </div>
              </div>
              <div style={{
                background: brandColor,
                color: '#fff',
                fontWeight: '900',
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: '3px',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                zIndex: 2,
              }}>
                {resolvedBrand}
              </div>
            </div>

            {/* Slat divider lines overlay */}
            {Array.from({ length: slatsPerFace - 1 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${(i + 1) * (140 / slatsPerFace)}px`,
                left: 0,
                right: 0,
                height: '2px',
                background: 'rgba(0,0,0,0.6)',
                zIndex: 3,
                pointerEvents: 'none',
              }} />
            ))}
          </div>

          {/* Face indicator */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px',
            zIndex: 5,
          }}>
            {faces.map((f, i) => (
              <div key={i} style={{
                width: '20px',
                height: '8px',
                background: i === 0 ? brandColor : 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                cursor: 'pointer',
              }} />
            ))}
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
        }}>
          Tri-Visão 9×3m
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
          Outdoor Tri-Visão — 3 Faces em Rotação · Ripa Triangular
        </div>
      </div>
    </div>
  );
};
