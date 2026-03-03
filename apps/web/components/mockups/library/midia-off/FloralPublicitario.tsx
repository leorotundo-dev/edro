'use client';

import React from 'react';

interface FloralPublicitarioProps {
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

export const FloralPublicitario: React.FC<FloralPublicitarioProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#cc4400',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Floreira Patrocinada';
  const resolvedBody = body ?? caption ?? description ?? 'Beleza urbana com sua marca';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const flowers = [
    { color: '#ff4488', size: 22, top: 0, left: 10 },
    { color: '#ff8800', size: 18, top: 5, left: 40 },
    { color: '#ffcc00', size: 20, top: -5, left: 70 },
    { color: '#ff4488', size: 16, top: 8, left: 98 },
    { color: '#cc44ff', size: 22, top: 0, left: 120 },
    { color: '#ff6600', size: 18, top: 4, left: 150 },
    { color: '#ff2266', size: 20, top: -3, left: 178 },
    { color: '#ffcc00', size: 16, top: 6, left: 205 },
    { color: '#88cc00', size: 20, top: 2, left: 232 },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c0c8b0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '340px' }}>

        {/* Street context */}
        <div style={{
          width: '340px',
          height: '60px',
          background: 'linear-gradient(180deg, #90c4d8 0%, #b0d0d8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#b8b090' }} />
        </div>

        {/* Sidewalk */}
        <div style={{
          width: '340px',
          background: '#c4bc98',
          padding: '10px 30px 20px',
          position: 'relative',
        }}>
          {/* Flower pot structure */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Flowers on top */}
            <div style={{
              width: '270px',
              height: '50px',
              position: 'relative',
              marginBottom: '0',
            }}>
              {flowers.map((flower, i) => (
                <div key={i} style={{ position: 'absolute', top: `${flower.top}px`, left: `${flower.left}px` }}>
                  {/* Stem */}
                  <div style={{
                    width: '2px',
                    height: '20px',
                    background: '#4a8a2a',
                    margin: '0 auto',
                    marginBottom: '0',
                  }} />
                  {/* Petals */}
                  <div style={{
                    width: `${flower.size}px`,
                    height: `${flower.size}px`,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, #fff 30%, ${flower.color} 100%)`,
                    boxShadow: `0 0 4px ${flower.color}44`,
                    marginTop: '-2px',
                    marginLeft: `${-flower.size / 2 + 1}px`,
                  }} />
                </div>
              ))}

              {/* Leaf greenery */}
              {[15, 65, 115, 165, 215].map((x, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: '22px',
                  left: `${x}px`,
                  width: '18px',
                  height: '10px',
                  background: '#3a8a1a',
                  borderRadius: '50% 0 50% 0',
                  transform: `rotate(${i % 2 === 0 ? 20 : -20}deg)`,
                }} />
              ))}
            </div>

            {/* Soil top */}
            <div style={{
              width: '280px',
              height: '14px',
              background: '#5a3a1a',
              borderRadius: '4px 4px 0 0',
              border: '2px solid #3a2010',
            }} />

            {/* Flower box body */}
            <div style={{
              width: '280px',
              height: '70px',
              background: '#6a5030',
              border: '3px solid #4a3020',
              borderTop: 'none',
              display: 'flex',
              alignItems: 'stretch',
              overflow: 'hidden',
              borderRadius: '0 0 6px 6px',
            }}>
              {/* Wood plank texture on sides */}
              <div style={{
                width: '20px',
                background: '#5a4020',
                flexShrink: 0,
                borderRight: '2px solid #4a3010',
                backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 6px)',
              }} />

              {/* Ad panel embedded */}
              <div style={{
                flex: 1,
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #221100 100%)`,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Floreira" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '4px' }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, marginBottom: '6px' }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>

              <div style={{
                width: '20px',
                background: '#5a4020',
                flexShrink: 0,
                borderLeft: '2px solid #4a3010',
                backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 6px)',
              }} />
            </div>

            {/* Base feet */}
            <div style={{ display: 'flex', gap: '60px', marginTop: '0' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: '14px',
                  height: '12px',
                  background: '#4a3020',
                  borderRadius: '0 0 3px 3px',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '340px', height: '12px', background: '#a8a080', borderRadius: '0 0 8px 8px' }} />

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
          Floreira Publicitária
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
          Floreira Publicitária — Painel Frontal + Flores Coloridas CSS
        </div>
      </div>
    </div>
  );
};
