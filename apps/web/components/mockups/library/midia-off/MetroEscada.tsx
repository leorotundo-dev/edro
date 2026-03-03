'use client';

import React from 'react';

interface MetroEscadaProps {
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

export const MetroEscada: React.FC<MetroEscadaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#cc0033',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Escada Rolante Metrô';
  const resolvedBody = body ?? caption ?? description ?? 'Impacte passageiros em movimento';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0e1018', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '440px' }}>

        {/* Station ceiling */}
        <div style={{
          width: '440px',
          height: '50px',
          background: '#0a0a14',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          borderBottom: '2px solid #1a1a2a',
        }}>
          {/* Ceiling lights */}
          {[40, 160, 280, 380].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '5px',
              left: `${x}px`,
              width: '44px',
              height: '6px',
              background: 'rgba(255,255,200,0.55)',
              borderRadius: '2px',
              boxShadow: '0 0 10px 4px rgba(255,255,200,0.2)',
            }} />
          ))}
        </div>

        {/* Escalator scene — angled perspective */}
        <div style={{
          width: '440px',
          height: '300px',
          background: 'linear-gradient(180deg, #101824 0%, #0a1018 100%)',
          position: 'relative',
          overflow: 'hidden',
          perspective: '600px',
        }}>
          {/* Escalator structure — inclined handrails */}
          <div style={{
            position: 'absolute',
            inset: 0,
          }}>
            {/* Left handrail */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '30px',
              width: '380px',
              height: '18px',
              background: '#1a1a2e',
              borderRadius: '6px',
              border: '2px solid #2a2a40',
              transform: 'rotate(-18deg) translateY(30px)',
              transformOrigin: 'left center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }} />
            {/* Right handrail */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '30px',
              width: '380px',
              height: '18px',
              background: '#1a1a2e',
              borderRadius: '6px',
              border: '2px solid #2a2a40',
              transform: 'rotate(-18deg) translateY(100px)',
              transformOrigin: 'left center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }} />

            {/* Steps */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${50 + i * 30}px`,
                left: `${40 + i * 8}px`,
                width: `${340 - i * 8}px`,
                height: '18px',
                background: '#161624',
                borderTop: '2px solid #252535',
                borderLeft: '2px solid #252535',
              }} />
            ))}

            {/* Ad strip on left wall of escalator */}
            <div style={{
              position: 'absolute',
              top: '60px',
              left: '0px',
              width: '28px',
              height: '220px',
              background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor} 0%, #550000 100%)`,
              border: `2px solid ${brandColor}66`,
              overflow: 'hidden',
              transform: 'skewY(-18deg)',
              transformOrigin: 'top left',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Faixa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>

            {/* Main ad panel on right wall */}
            <div style={{
              position: 'absolute',
              top: '40px',
              right: '0px',
              width: '32px',
              height: '240px',
              background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor} 0%, #330011 100%)`,
              border: `2px solid ${brandColor}66`,
              overflow: 'hidden',
              transform: 'skewY(-18deg)',
              transformOrigin: 'top right',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Faixa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
            </div>

            {/* Wide lateral ad strip */}
            <div style={{
              position: 'absolute',
              top: '120px',
              left: '30px',
              right: '40px',
              height: '85px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #0a0a1e 0%, ${brandColor}cc 50%, #220010 100%)`,
              border: `2px solid ${brandColor}44`,
              overflow: 'hidden',
              transform: 'rotate(-18deg)',
              transformOrigin: 'left center',
              borderRadius: '3px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Painel lateral" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '900',
                    color: '#fff',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                    maxWidth: '200px',
                    lineHeight: 1.2,
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '6px 12px',
                    borderRadius: '3px',
                    flexShrink: 0,
                    textTransform: 'uppercase',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Perspective lines overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%),
              linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 30%)
            `,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Bottom info strip */}
        <div style={{
          width: '440px',
          height: '40px',
          background: '#0a0a14',
          borderTop: `3px solid ${brandColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderRadius: '0 0 4px 4px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
            {resolvedBody}
          </div>
          <div style={{
            background: brandColor,
            color: '#fff',
            fontSize: '10px',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '3px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
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
          Escada Rolante
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
          Metrô Escada — Faixa Lateral em Escada Rolante
        </div>
      </div>
    </div>
  );
};
