'use client';

import React from 'react';

interface PlacaRuaProps {
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

export const PlacaRua: React.FC<PlacaRuaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#1a3a8a',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Rua das Flores';
  const resolvedBody = body ?? caption ?? description ?? 'Patrocinado por';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';
  const streetName = resolvedHeadline;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8c0c8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Street scene */}
        <div style={{
          width: '360px',
          height: '80px',
          background: 'linear-gradient(180deg, #90c0d8 0%, #b0d0dc 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '16px', background: '#c0b890' }} />
        </div>

        {/* Ground */}
        <div style={{
          width: '360px',
          background: '#b8b090',
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0 20px',
          position: 'relative',
        }}>
          {/* Signpost assembly */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Street sign — blue signpost shape */}
            <div style={{
              background: brandColor,
              color: '#fff',
              padding: '6px 20px',
              borderRadius: '4px',
              border: '3px solid #102870',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              position: 'relative',
              width: '240px',
              textAlign: 'center',
            }}>
              {/* Notch left arrow shape */}
              <div style={{
                position: 'absolute',
                left: '-14px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '18px solid transparent',
                borderBottom: '18px solid transparent',
                borderRight: `14px solid ${brandColor}`,
              }} />
              <div style={{
                position: 'absolute',
                left: '-18px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '21px solid transparent',
                borderBottom: '21px solid transparent',
                borderRight: '15px solid #102870',
              }} />

              <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                {streetName}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px', letterSpacing: '0.5px' }}>
                CEP 01000-000
              </div>
            </div>

            {/* Horizontal bar */}
            <div style={{
              width: '12px',
              height: '20px',
              background: '#666',
              boxShadow: '1px 0 3px rgba(0,0,0,0.2)',
            }} />

            {/* Sponsored panel */}
            <div style={{
              width: '240px',
              background: '#fff',
              border: '3px solid #ccc',
              borderRadius: '4px',
              padding: '5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              <div style={{
                width: '100%',
                height: '80px',
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001133 0%, ${brandColor}cc 50%, #000a1e 100%)`,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: '2px',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Patrocínio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '900',
                    padding: '6px 16px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    boxShadow: `0 2px 8px ${brandColor}66`,
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>
            </div>

            {/* Post */}
            <div style={{
              width: '12px',
              height: '50px',
              background: 'linear-gradient(90deg, #555 0%, #888 50%, #555 100%)',
            }} />

            {/* Base plate */}
            <div style={{
              width: '40px',
              height: '10px',
              background: '#444',
              borderRadius: '0 0 3px 3px',
            }} />
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '360px', height: '12px', background: '#9a9278', borderRadius: '0 0 8px 8px' }} />

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
          Placa de Rua
        </div>

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#555',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Placa de Rua + Painel Patrocinado — Formato Municipal
        </div>
      </div>
    </div>
  );
};
