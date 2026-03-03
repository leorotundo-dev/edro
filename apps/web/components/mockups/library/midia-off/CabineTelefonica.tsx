'use client';

import React from 'react';

interface CabineTelefonicaProps {
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

export const CabineTelefonica: React.FC<CabineTelefonicaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#cc0000',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Ligação Direta com Você';
  const resolvedBody = body ?? caption ?? description ?? 'Presente em cada esquina da cidade';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8c0c8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Phone booth silhouette */}
        <div style={{
          width: '180px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Booth top (domed roof) */}
          <div style={{
            width: '180px',
            height: '28px',
            background: '#cc1100',
            borderRadius: '8px 8px 0 0',
            border: '3px solid #aa0000',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: '#fff',
              fontWeight: '900',
              letterSpacing: '1px',
            }}>
              TELEFONE
            </div>
          </div>

          {/* Booth body */}
          <div style={{
            width: '180px',
            height: '320px',
            background: '#cc1100',
            border: '3px solid #aa0000',
            borderTop: 'none',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Left glass panel */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '25px',
              background: 'rgba(180,220,255,0.25)',
              border: '2px solid #aa0000',
              borderTop: 'none',
              borderBottom: 'none',
            }} />
            {/* Right glass panel */}
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '25px',
              background: 'rgba(180,220,255,0.25)',
              border: '2px solid #aa0000',
              borderTop: 'none',
              borderBottom: 'none',
            }} />

            {/* Front glass — main panels */}
            <div style={{ flex: 1, margin: '8px 28px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Top glass section */}
              <div style={{
                height: '90px',
                background: 'rgba(180,220,255,0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '2px',
              }} />

              {/* Ad panel */}
              <div style={{
                flex: 1,
                background: '#fff',
                padding: '4px',
                boxShadow: '0 0 8px rgba(255,255,255,0.3)',
                borderRadius: '2px',
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001133 0%, ${brandColor}cc 50%, #110000 100%)`,
                  overflow: 'hidden',
                  position: 'relative',
                  borderRadius: '1px',
                }}>
                  {resolvedImage ? (
                    <img src={resolvedImage} alt="Cabine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '6px' }}>
                      {resolvedHeadline}
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, marginBottom: '8px' }}>
                      {resolvedBody}
                    </div>
                    <div style={{
                      background: brandColor,
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '4px 8px',
                      borderRadius: '2px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {resolvedBrand}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom section with phone device hint */}
              <div style={{
                height: '50px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  border: '3px solid rgba(255,255,255,0.4)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}>
                  📞
                </div>
              </div>
            </div>
          </div>

          {/* Base */}
          <div style={{ width: '180px', height: '14px', background: '#aa0000', borderRadius: '0 0 4px 4px' }} />
        </div>

        {/* Format badge */}
        <div style={{
          position: 'absolute',
          top: '0px',
          right: '0px',
          background: brandColor,
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 10,
        }}>
          Cabine Telefônica
        </div>

        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#555',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Cabine Telefônica — Painel Interno · Formato Icônico
        </div>
      </div>
    </div>
  );
};
