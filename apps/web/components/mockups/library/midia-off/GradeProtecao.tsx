'use client';

import React from 'react';

interface GradeProtecaoProps {
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

export const GradeProtecao: React.FC<GradeProtecaoProps> = ({
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
  const resolvedHeadline = headline ?? title ?? name ?? 'Em Obra? Sua Marca Aqui';
  const resolvedBody = body ?? caption ?? description ?? 'Impacte quem passa pela obra todos os dias';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c8c4b8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '480px' }}>

        {/* Construction site scene */}
        <div style={{
          width: '480px',
          height: '70px',
          background: 'linear-gradient(180deg, #8ab4c8 0%, #a8c8d4 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Crane silhouette */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '60px',
            width: '4px',
            height: '50px',
            background: '#555',
          }}>
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '4px',
              width: '40px',
              height: '3px',
              background: '#555',
            }} />
          </div>
          {/* Building behind fence */}
          {[20, 100, 200, 300, 380].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '10px',
              left: `${x}px`,
              width: `${30 + i * 5}px`,
              height: `${20 + (i % 3) * 15}px`,
              background: 'rgba(80,80,90,0.3)',
            }} />
          ))}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10px', background: '#b0a880' }} />
        </div>

        {/* Construction hoarding fence */}
        <div style={{
          width: '480px',
          position: 'relative',
          background: '#b0a880',
          paddingBottom: '20px',
        }}>
          {/* Fence posts */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{
              position: 'absolute',
              top: 0,
              left: `${i * 70}px`,
              width: '10px',
              height: '180px',
              background: '#666',
              zIndex: 3,
            }} />
          ))}

          {/* Continuous vinyl banner stretched across panels */}
          <div style={{
            margin: '0 5px',
            height: '150px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #111111 0%, ${brandColor}cc 40%, #1a0800 100%)`,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Grade" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 20px)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 50%)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '24px',
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
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: '8px',
                    fontWeight: '400',
                  }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '13px',
                  padding: '12px 18px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: `0 2px 12px ${brandColor}66`,
                }}>
                  {resolvedBrand}
                </div>
              </div>

              {/* Construction icon */}
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '12px',
                fontSize: '16px',
                opacity: 0.5,
              }}>
                🦺
              </div>
            </div>
          </div>

          {/* Top horizontal beam */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '12px',
            background: '#555',
            zIndex: 4,
          }} />
          {/* Bottom horizontal beam */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: 0,
            right: 0,
            height: '8px',
            background: '#555',
            zIndex: 4,
          }} />
        </div>

        {/* Ground */}
        <div style={{ width: '480px', height: '14px', background: '#9a9278', borderRadius: '0 0 8px 8px' }} />

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
          Grade de Obras
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
          Grade de Proteção — Banner Vinílico em Tapume de Obra
        </div>
      </div>
    </div>
  );
};
