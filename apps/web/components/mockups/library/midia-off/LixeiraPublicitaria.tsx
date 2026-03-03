'use client';

import React from 'react';

interface LixeiraPublicitariaProps {
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

export const LixeiraPublicitaria: React.FC<LixeiraPublicitariaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#2a7a4a',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Descarte Certo, Marca Certa';
  const resolvedBody = body ?? caption ?? description ?? 'Responsabilidade ambiental com sua marca';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8c4b0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Street context */}
        <div style={{
          width: '300px',
          height: '60px',
          background: 'linear-gradient(180deg, #88b8cc 0%, #aaccd8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14px', background: '#c0b890' }} />
        </div>

        {/* Ground scene */}
        <div style={{
          width: '300px',
          background: '#b8b090',
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 0 20px',
          position: 'relative',
        }}>
          {/* Trash bin body */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Lid — rounded */}
            <div style={{
              width: '110px',
              height: '18px',
              background: '#3a3a3a',
              borderRadius: '8px 8px 2px 2px',
              border: '2px solid #222',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              position: 'relative',
            }}>
              {/* Handle */}
              <div style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '30px',
                height: '8px',
                border: '3px solid #333',
                borderBottom: 'none',
                borderRadius: '4px 4px 0 0',
                background: 'transparent',
              }} />
              {/* Flip hinge */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '20px',
                height: '3px',
                background: '#555',
                borderRadius: '1px',
              }} />
            </div>

            {/* Bin body */}
            <div style={{
              width: '100px',
              height: '200px',
              background: '#4a4a4a',
              border: '3px solid #333',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Top opening slot */}
              <div style={{
                width: '60px',
                height: '6px',
                background: '#222',
                borderRadius: '3px',
                margin: '6px auto 0',
                flexShrink: 0,
              }} />

              {/* Ad panel on side */}
              <div style={{
                flex: 1,
                margin: '6px',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor}ee 0%, #001100 100%)`,
                overflow: 'hidden',
                position: 'relative',
                borderRadius: '3px',
                border: `1px solid ${brandColor}44`,
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Lixeira" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)',
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
                  padding: '6px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  <div style={{ fontSize: '9px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '4px' }}>
                    {resolvedHeadline.substring(0, 20)}
                  </div>
                  <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.3, marginBottom: '6px' }}>
                    {resolvedBody.substring(0, 28)}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '7px',
                    fontWeight: '700',
                    padding: '3px 6px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>

              {/* Recycle symbol */}
              <div style={{
                textAlign: 'center',
                fontSize: '14px',
                paddingBottom: '4px',
                flexShrink: 0,
                opacity: 0.5,
              }}>
                ♻️
              </div>
            </div>

            {/* Base flange */}
            <div style={{
              width: '110px',
              height: '8px',
              background: '#555',
              borderRadius: '0 0 4px 4px',
            }} />
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '300px', height: '12px', background: '#9a9278', borderRadius: '0 0 8px 8px' }} />

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
          Lixeira Publicitária
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
          Lixeira Publicitária — Painel Frontal + Tampa Arredondada
        </div>
      </div>
    </div>
  );
};
