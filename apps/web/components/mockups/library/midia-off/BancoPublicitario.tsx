'use client';

import React from 'react';

interface BancoPublicitarioProps {
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

export const BancoPublicitario: React.FC<BancoPublicitarioProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#1a5276',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Banco Patrocinado';
  const resolvedBody = body ?? caption ?? description ?? 'Seu anúncio onde as pessoas descansam';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8c4a8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '440px' }}>

        {/* Park scene */}
        <div style={{
          width: '440px',
          height: '100px',
          background: 'linear-gradient(180deg, #7ab4d0 0%, #a8c8d8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Grass */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px', background: '#7a9a4a' }} />
          {/* Tree silhouette on left */}
          <div style={{ position: 'absolute', bottom: '28px', left: '20px' }}>
            <div style={{ width: '40px', height: '60px', background: '#3d7a3d', borderRadius: '50% 50% 30% 30%' }} />
            <div style={{ width: '10px', height: '20px', background: '#5c3d1e', margin: '0 auto' }} />
          </div>
          {/* Tree silhouette on right */}
          <div style={{ position: 'absolute', bottom: '28px', right: '20px' }}>
            <div style={{ width: '35px', height: '55px', background: '#2d6a2d', borderRadius: '50% 50% 30% 30%' }} />
            <div style={{ width: '8px', height: '18px', background: '#4a2d0e', margin: '0 auto' }} />
          </div>
        </div>

        {/* Park scene / ground */}
        <div style={{
          width: '440px',
          background: '#8aaa52',
          padding: '12px 30px 20px',
          position: 'relative',
        }}>
          {/* Bench structure */}
          <div style={{ position: 'relative' }}>
            {/* Backrest panel — ad area */}
            <div style={{
              width: '100%',
              height: '90px',
              background: '#fff',
              padding: '5px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
              borderRadius: '4px 4px 0 0',
              border: '2px solid #ddd',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #0a0a20 100%)`,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: '2px',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Banco" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 18px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#fff', lineHeight: 1.2, maxWidth: '200px' }}>
                      {resolvedHeadline}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                      {resolvedBody}
                    </div>
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '8px 12px',
                    borderRadius: '3px',
                    flexShrink: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>
            </div>

            {/* Bench seat — wooden slats */}
            <div style={{
              width: '100%',
              height: '22px',
              background: '#d4b870',
              border: '2px solid #b89850',
              display: 'flex',
              padding: '3px 4px',
              gap: '3px',
              borderTop: 'none',
            }}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={{
                  flex: 1,
                  background: '#c8a860',
                  borderRadius: '1px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                }} />
              ))}
            </div>

            {/* Bench legs */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingLeft: '20px',
              paddingRight: '20px',
              marginTop: '2px',
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '8px',
                }}>
                  <div style={{
                    width: '6px',
                    height: '20px',
                    background: '#888',
                    borderRadius: '0 0 2px 2px',
                    transform: 'skewX(-8deg)',
                  }} />
                  <div style={{
                    width: '6px',
                    height: '20px',
                    background: '#888',
                    borderRadius: '0 0 2px 2px',
                    transform: 'skewX(8deg)',
                  }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '440px', height: '12px', background: '#6a8a42', borderRadius: '0 0 8px 8px' }} />

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
          Banco Publicitário
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
          Banco Publicitário — Encosto + Ripas de Madeira CSS · Parque
        </div>
      </div>
    </div>
  );
};
