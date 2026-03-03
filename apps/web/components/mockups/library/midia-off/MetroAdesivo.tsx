'use client';

import React from 'react';

interface MetroAdesivoProps {
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

export const MetroAdesivo: React.FC<MetroAdesivoProps> = ({
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
  const resolvedHeadline = headline ?? title ?? name ?? 'Adesivo de Metrô';
  const resolvedBody = body ?? caption ?? description ?? 'Alcance milhões de passageiros por mês';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#1a1a2e', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '340px' }}>

        {/* Metro car window shapes above */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '4px',
          padding: '0 10px',
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              flex: 1,
              height: '50px',
              background: '#0d0d20',
              borderRadius: '40px 40px 4px 4px',
              border: '2px solid #333',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(150,200,255,0.15) 0%, transparent 100%)',
              }} />
            </div>
          ))}
        </div>

        {/* Car wall/door panel */}
        <div style={{
          width: '340px',
          background: '#0d1a2e',
          border: '3px solid #1a3050',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          {/* Door gap in the middle */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '3px',
            background: '#050a10',
            zIndex: 5,
          }} />

          {/* Vinyl texture striped panel */}
          <div style={{
            width: '100%',
            height: '260px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Vinyl stripe background */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `repeating-linear-gradient(
                -45deg,
                ${brandColor}11 0px, ${brandColor}11 4px,
                transparent 4px, transparent 20px
              )`,
            }} />

            {/* Ad content */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #0a0a1e 0%, ${brandColor}bb 60%, #1a0030 100%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '20px 28px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Adesivo" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}

              <div style={{
                position: 'relative',
                zIndex: 2,
                background: resolvedImage ? 'rgba(0,0,0,0.5)' : 'none',
                padding: resolvedImage ? '12px' : '0',
                borderRadius: resolvedImage ? '6px' : '0',
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: `0 0 20px ${brandColor}88, 0 2px 10px rgba(0,0,0,0.8)`,
                  letterSpacing: '-0.5px',
                  marginBottom: '10px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.85)',
                  fontWeight: '400',
                  lineHeight: 1.5,
                  marginBottom: '16px',
                }}>
                  {resolvedBody}
                </div>
                <div style={{
                  display: 'inline-block',
                  background: brandColor,
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '12px',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: `0 0 16px ${brandColor}66`,
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* Metro brand stripe at bottom */}
          <div style={{
            height: '28px',
            background: '#0a0a14',
            borderTop: `3px solid ${brandColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
          }}>
            <div style={{
              fontSize: '10px',
              color: brandColor,
              fontWeight: '700',
              letterSpacing: '1.5px',
            }}>
              METRÔ SP
            </div>
            <div style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '1px',
            }}>
              ADESIVO DE METRÔ
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
          Adesivo de Metrô
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
          Adesivo de Metrô — Vinílico em Portas e Painéis
        </div>
      </div>
    </div>
  );
};
