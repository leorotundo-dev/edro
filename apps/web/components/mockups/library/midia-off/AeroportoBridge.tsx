'use client';

import React from 'react';

interface AeroportoBridgeProps {
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

export const AeroportoBridge: React.FC<AeroportoBridgeProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#0066aa',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Sua Próxima Aventura Começa Aqui';
  const resolvedBody = body ?? caption ?? description ?? 'A bordo ou em terra, estamos com você';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#d8dce4', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '480px' }}>

        {/* Jetbridge corridor — perspective */}
        <div style={{
          width: '480px',
          height: '320px',
          background: 'linear-gradient(180deg, #e8ecf0 0%, #d0d8e0 100%)',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          perspective: '600px',
        }}>
          {/* Corridor ceiling */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '90px',
            background: 'linear-gradient(180deg, #c8d0d8 0%, #d8dce4 100%)',
            borderBottom: '3px solid #b0bac4',
          }}>
            {/* Ceiling lighting strip */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '20%',
              right: '20%',
              height: '6px',
              background: 'rgba(255,255,255,0.8)',
              borderRadius: '3px',
              boxShadow: '0 0 20px 8px rgba(255,255,255,0.4)',
            }} />

            {/* "BOARDING" sign */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#00aa44',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '900',
              padding: '4px 14px',
              borderRadius: '3px',
              letterSpacing: '2px',
              whiteSpace: 'nowrap',
            }}>
              EMBARQUE · BOARDING
            </div>
          </div>

          {/* Left wall with oval airplane windows */}
          <div style={{
            position: 'absolute',
            top: '90px',
            bottom: '60px',
            left: 0,
            width: '70px',
            background: '#c8cfd8',
            borderRight: '3px solid #b0b8c0',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${20 + i * 56}px`,
                left: '8px',
                width: '38px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(180,210,255,0.4)',
                border: '3px solid #a8b8c8',
                boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.3)',
              }} />
            ))}
          </div>

          {/* Right wall with ad panels */}
          <div style={{
            position: 'absolute',
            top: '90px',
            bottom: '60px',
            right: 0,
            width: '70px',
            background: '#c8cfd8',
            borderLeft: '3px solid #b0b8c0',
          }}>
            {/* Ad panels on right wall */}
            {[0, 1].map((i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${16 + i * 80}px`,
                right: '8px',
                width: '48px',
                height: '64px',
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #003366 100%)`,
                border: '2px solid #8898a8',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Painel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4px',
                  }}>
                    <span style={{ color: '#fff', fontSize: '7px', fontWeight: '700', textAlign: 'center', lineHeight: 1.2 }}>
                      {resolvedBrand}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Floor */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: '#a0a8b0',
            borderTop: '3px solid #8890a0',
          }}>
            {/* Floor direction arrow */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '28px',
              fontWeight: '900',
              opacity: 0.4,
            }}>
              →
            </div>
          </div>

          {/* Main corridor ad panel */}
          <div style={{
            position: 'absolute',
            top: '110px',
            left: '80px',
            right: '80px',
            height: '130px',
            background: '#fff',
            padding: '6px',
            boxShadow: '0 0 25px 6px rgba(255,255,255,0.4)',
            borderRadius: '3px',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001a33 0%, ${brandColor} 55%, #002244 100%)`,
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Bridge ad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '14px 18px',
                background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                  maxWidth: '200px',
                  letterSpacing: '-0.3px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                  marginTop: '8px',
                  fontWeight: '300',
                }}>
                  {resolvedBody}
                </div>
                <div style={{
                  marginTop: '10px',
                  display: 'inline-block',
                  background: brandColor,
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  alignSelf: 'flex-start',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* Gate number */}
          <div style={{
            position: 'absolute',
            top: '100px',
            left: '80px',
            background: '#222',
            color: '#fff',
            fontSize: '9px',
            fontWeight: '700',
            padding: '3px 8px',
            borderRadius: '2px',
            letterSpacing: '1px',
          }}>
            GATE A12
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
          Finger / Bridge
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
          Aeroporto Bridge — Corredor de Embarque · Painel de Finger
        </div>
      </div>
    </div>
  );
};
