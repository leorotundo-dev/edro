'use client';

import React from 'react';

interface ColunaPublicidadeProps {
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

export const ColunaPublicidade: React.FC<ColunaPublicidadeProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#8b1a1a',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Coluna Morris';
  const resolvedBody = body ?? caption ?? description ?? 'Tradição e impacto visual';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  // Simulate multiple poster layers (overlapping edges = peeling effect)
  const posterLayers = [
    { hue: brandColor, rotation: -3, zIndex: 1, opacity: 0.7 },
    { hue: '#1a4488', rotation: 2, zIndex: 2, opacity: 0.8 },
    { hue: '#2a6a2a', rotation: -1, zIndex: 3, opacity: 0.9 },
    { hue: brandColor, rotation: 0, zIndex: 4, opacity: 1 },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8b0a8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Street context */}
        <div style={{
          width: '300px',
          height: '60px',
          background: 'linear-gradient(180deg, #88b8cc 0%, #aaccd4 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14px', background: '#b8b090' }} />
        </div>

        {/* Ground */}
        <div style={{
          width: '300px',
          background: '#aaa890',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '10px',
          paddingBottom: '20px',
          position: 'relative',
        }}>
          {/* Morris column — cylindrical shape */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Dome top */}
            <div style={{
              width: '110px',
              height: '28px',
              background: 'linear-gradient(180deg, #5a5040 0%, #3a3028 100%)',
              borderRadius: '50% 50% 0 0',
              border: '2px solid #2a2018',
            }} />

            {/* Column body — cylindrical */}
            <div style={{ position: 'relative', width: '110px', height: '300px' }}>
              {/* Left shadow edge */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '16px',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
                zIndex: 6,
                borderRadius: '2px 0 0 2px',
              }} />
              {/* Right highlight edge */}
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '14px',
                background: 'linear-gradient(270deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
                zIndex: 6,
                borderRadius: '0 2px 2px 0',
              }} />

              {/* Poster layers — peeling effect */}
              {posterLayers.map((layer, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: `${i * 2}px`,
                  left: `${2 + Math.abs(layer.rotation) * 2}px`,
                  right: `${2 + Math.abs(layer.rotation) * 2}px`,
                  bottom: `${i * 2}px`,
                  background: layer.hue,
                  zIndex: layer.zIndex,
                  opacity: layer.opacity,
                  overflow: 'hidden',
                  transform: `rotate(${layer.rotation}deg)`,
                  transformOrigin: 'bottom left',
                }}>
                  {/* Poster edge detail */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(255,255,255,0.15)',
                  }} />
                </div>
              ))}

              {/* Main front poster (active) */}
              <div style={{
                position: 'absolute',
                top: '6px',
                left: '6px',
                right: '6px',
                bottom: '6px',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor} 0%, #220000 60%, ${brandColor}88 100%)`,
                zIndex: 5,
                overflow: 'hidden',
                borderRadius: '1px',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Cartaz" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '90px',
                      height: '90px',
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
                  padding: '10px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '6px' }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, marginBottom: '8px' }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.9)',
                    color: brandColor,
                    fontSize: '9px',
                    fontWeight: '900',
                    padding: '4px 10px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>
            </div>

            {/* Column base cap */}
            <div style={{
              width: '120px',
              height: '14px',
              background: '#4a4030',
              border: '2px solid #3a3020',
              borderRadius: '0 0 4px 4px',
            }} />

            {/* Pedestal */}
            <div style={{
              width: '80px',
              height: '20px',
              background: '#5a5040',
              border: '2px solid #3a3020',
              borderRadius: '0 0 4px 4px',
            }} />
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '300px', height: '14px', background: '#9a9278', borderRadius: '0 0 8px 8px' }} />

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
          Coluna Morris
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
          Coluna de Publicidade — Morris · Cartazes Sobrepostos
        </div>
      </div>
    </div>
  );
};
