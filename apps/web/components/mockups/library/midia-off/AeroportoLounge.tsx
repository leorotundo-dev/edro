'use client';

import React from 'react';

interface AeroportoLoungeProps {
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

export const AeroportoLounge: React.FC<AeroportoLoungeProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#7b2d8b',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Lounge VIP Exclusivo';
  const resolvedBody = body ?? caption ?? description ?? 'Experiências premium para quem exige o melhor';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#1a1618', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '480px' }}>

        {/* Lounge scene */}
        <div style={{
          width: '480px',
          height: '320px',
          background: 'linear-gradient(180deg, #1a1420 0%, #0e0c12 100%)',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ceiling with mood lighting */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80px',
            background: '#111018',
          }}>
            {/* Pendant lights */}
            {[80, 200, 320, 420].map((x, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: 0,
                left: `${x}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{ width: '2px', height: `${20 + i * 4}px`, background: '#333' }} />
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: 'rgba(255,220,150,0.7)',
                  boxShadow: '0 0 12px 6px rgba(255,220,150,0.2)',
                }} />
              </div>
            ))}
          </div>

          {/* Lounge floor */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50px',
            background: '#1a1824',
          }}>
            {/* Floor reflection */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(255,255,255,0.02) 79px, rgba(255,255,255,0.02) 80px)',
            }} />
          </div>

          {/* Lounge seating silhouettes */}
          <div style={{
            position: 'absolute',
            bottom: '50px',
            left: '20px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
          }}>
            {/* Armchair 1 */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '55px',
                height: '35px',
                background: '#2a2840',
                borderRadius: '6px 6px 0 0',
                border: '1px solid #3a3858',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#3a3858',
                }} />
              </div>
              <div style={{
                width: '55px',
                height: '20px',
                background: '#222038',
                borderRadius: '0 0 4px 4px',
              }} />
            </div>
            {/* Side table */}
            <div style={{
              width: '30px',
              height: '25px',
              background: '#1e1c30',
              borderRadius: '3px',
              border: '1px solid #2a2840',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '12px',
                height: '5px',
                background: '#333050',
                borderRadius: '2px',
              }} />
            </div>
            {/* Armchair 2 */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '60px',
                height: '40px',
                background: '#2a2840',
                borderRadius: '6px 6px 0 0',
                border: '1px solid #3a3858',
              }} />
              <div style={{
                width: '60px',
                height: '20px',
                background: '#222038',
                borderRadius: '0 0 4px 4px',
              }} />
            </div>
            {/* Small passenger silhouette */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3a3858' }} />
              <div style={{ width: '14px', height: '22px', background: '#333050', borderRadius: '3px 3px 0 0' }} />
            </div>
          </div>

          {/* Right wall - digital display */}
          <div style={{
            position: 'absolute',
            top: '80px',
            right: '20px',
            width: '180px',
            bottom: '60px',
            background: '#0d0c18',
            borderRadius: '8px',
            border: '3px solid #1a1828',
            overflow: 'hidden',
            boxShadow: `0 0 30px ${brandColor}33`,
          }}>
            {/* Screen bezel */}
            <div style={{
              position: 'absolute',
              inset: '4px',
              background: resolvedImage ? 'transparent' : `linear-gradient(180deg, #0a0818 0%, ${brandColor}88 50%, #0a0818 100%)`,
              borderRadius: '5px',
              overflow: 'hidden',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Display lounge" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '-30px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: `${brandColor}22`,
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
                padding: '12px',
                background: resolvedImage ? 'rgba(0,0,0,0.4)' : 'none',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '900',
                  color: '#fff',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  textShadow: `0 0 12px ${brandColor}`,
                  marginBottom: '8px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.7)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  marginBottom: '10px',
                }}>
                  {resolvedBody}
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: `0 0 10px ${brandColor}66`,
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* VIP badge */}
          <div style={{
            position: 'absolute',
            top: '90px',
            left: '20px',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '8px 14px',
            borderRadius: '8px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              VIP Lounge
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
          boxShadow: `0 0 10px ${brandColor}66`,
        }}>
          Lounge VIP
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
          Aeroporto Lounge — Display Digital em Sala VIP Premium
        </div>
      </div>
    </div>
  );
};
