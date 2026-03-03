'use client';

import React from 'react';

interface AeroportoTotemProps {
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

export const AeroportoTotem: React.FC<AeroportoTotemProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#003366',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Totem de Navegação';
  const resolvedBody = body ?? caption ?? description ?? 'Guiando passageiros com sua marca';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#d0d4dc', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Airport scene */}
        <div style={{
          width: '340px',
          height: '80px',
          background: 'linear-gradient(180deg, #d8e0e8 0%, #c8d0d8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ceiling */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,0,0,0.04) 49px, rgba(0,0,0,0.04) 50px)',
          }} />
          {/* Lights */}
          {[60, 170, 280].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '12px',
              left: `${x}px`,
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(255,255,220,0.9)',
              boxShadow: '0 0 10px 4px rgba(255,255,220,0.3)',
            }} />
          ))}
        </div>

        {/* Floor */}
        <div style={{
          width: '340px',
          background: '#c8ccd4',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '10px',
          paddingBottom: '20px',
          position: 'relative',
        }}>
          {/* Totem structure */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Wayfinding arrows header */}
            <div style={{
              width: '120px',
              background: brandColor,
              padding: '8px',
              borderRadius: '4px 4px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}>
              {/* Directional items */}
              {[
                { icon: '→', text: 'Embarque A' },
                { icon: '↑', text: 'Embarque B' },
                { icon: '←', text: 'Desembarque' },
                { icon: '↓', text: 'Estacionamento' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 4px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                }}>
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: '900', width: '14px', textAlign: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{ color: '#fff', fontSize: '9px', fontWeight: '600', letterSpacing: '0.3px' }}>
                    {item.text}
                  </span>
                </div>
              ))}

              {/* Floor numbers */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: '4px',
                borderTop: '1px solid rgba(255,255,255,0.2)',
                paddingTop: '4px',
              }}>
                {['T1', 'T2', 'T3'].map((t, i) => (
                  <div key={i} style={{
                    background: i === 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '8px',
                    fontWeight: '700',
                    padding: '2px 6px',
                    borderRadius: '2px',
                  }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Ad strip integrated in lower panel */}
            <div style={{
              width: '120px',
              background: '#fff',
              padding: '4px',
              boxShadow: '0 0 12px 2px rgba(255,255,255,0.3)',
            }}>
              <div style={{
                width: '100%',
                height: '90px',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, #001122 0%, ${brandColor}dd 50%, #001122 100%)`,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: '1px',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Totem ad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  background: resolvedImage ? 'rgba(0,0,0,0.4)' : 'none',
                }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '900',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '8px',
                    color: 'rgba(255,255,255,0.75)',
                    textAlign: 'center',
                    marginTop: '4px',
                    lineHeight: 1.3,
                  }}>
                    {resolvedBody.substring(0, 28)}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    background: brandColor,
                    color: '#fff',
                    fontSize: '8px',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '2px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>
            </div>

            {/* Totem base */}
            <div style={{
              width: '80px',
              height: '12px',
              background: '#555',
              borderRadius: '2px',
            }} />
            <div style={{
              width: '100px',
              height: '8px',
              background: '#444',
              borderRadius: '0 0 4px 4px',
            }} />
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
          Totem Aeroporto
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
          Aeroporto Totem — Wayfinding + Painel Publicitário Integrado
        </div>
      </div>
    </div>
  );
};
