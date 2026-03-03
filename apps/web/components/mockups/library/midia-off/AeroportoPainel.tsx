'use client';

import React from 'react';

interface AeroportoPainelProps {
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

export const AeroportoPainel: React.FC<AeroportoPainelProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#0044aa',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Painel de Partidas';
  const resolvedBody = body ?? caption ?? description ?? 'Patrocinador oficial dos voos';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const flightData = [
    { flight: 'LA 3050', dest: 'São Paulo (GRU)', time: '08:15', gate: 'A14', status: 'Embarcando' },
    { flight: 'G3 1200', dest: 'Rio de Janeiro (GIG)', time: '08:45', gate: 'B02', status: 'No prazo' },
    { flight: 'AD 5520', dest: 'Brasília (BSB)', time: '09:10', gate: 'C07', status: 'No prazo' },
    { flight: 'LA 8040', dest: 'Recife (REC)', time: '09:30', gate: 'A09', status: 'Atrasado' },
    { flight: 'G3 2140', dest: 'Salvador (SSA)', time: '09:50', gate: 'B11', status: 'No prazo' },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0a0c14', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '500px' }}>

        {/* Terminal ceiling */}
        <div style={{
          width: '500px',
          height: '60px',
          background: '#111420',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255,255,255,0.025) 49px, rgba(255,255,255,0.025) 50px)',
          }} />
          {/* Terminal name */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '16px',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Aeroporto Internacional · Terminal 2
          </div>
        </div>

        {/* Main content area */}
        <div style={{
          width: '500px',
          background: '#0d1020',
          padding: '16px',
        }}>
          {/* Flight departures board */}
          <div style={{
            background: '#080c14',
            border: '2px solid #1a2030',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '14px',
          }}>
            {/* Board header */}
            <div style={{
              background: '#111828',
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1a2030',
            }}>
              <div style={{ fontSize: '11px', color: '#fff', fontWeight: '700', letterSpacing: '1.5px' }}>
                PARTIDAS — DEPARTURES
              </div>
              <div style={{
                background: brandColor,
                color: '#fff',
                fontSize: '9px',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '3px',
                letterSpacing: '0.5px',
              }}>
                Patrocinado por {resolvedBrand}
              </div>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 60px 50px 80px',
              padding: '5px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              {['Voo', 'Destino', 'Horário', 'Portão', 'Status'].map((h) => (
                <div key={h} style={{ fontSize: '9px', color: '#888', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Flight rows */}
            {flightData.map((f, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 60px 50px 80px',
                padding: '7px 14px',
                borderBottom: i < flightData.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}>
                <div style={{ fontSize: '10px', color: '#fff', fontWeight: '700' }}>{f.flight}</div>
                <div style={{ fontSize: '10px', color: '#ccc' }}>{f.dest}</div>
                <div style={{ fontSize: '10px', color: '#aaa', fontWeight: '600' }}>{f.time}</div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>{f.gate}</div>
                <div style={{
                  fontSize: '9px',
                  color: f.status === 'Embarcando' ? '#00cc66' : f.status === 'Atrasado' ? '#ff4444' : '#aaa',
                  fontWeight: '600',
                }}>
                  {f.status}
                </div>
              </div>
            ))}
          </div>

          {/* Sponsor ad panel */}
          <div style={{
            width: '100%',
            background: '#fff',
            padding: '6px',
            boxShadow: '0 0 16px 3px rgba(255,255,255,0.2)',
            borderRadius: '3px',
          }}>
            <div style={{
              width: '100%',
              height: '100px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001230 0%, ${brandColor} 50%, #000a20 100%)`,
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '2px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Painel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 60%)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#fff', lineHeight: 1.1, maxWidth: '260px' }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '900',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: `0 4px 16px ${brandColor}66`,
                }}>
                  {resolvedBrand}
                </div>
              </div>
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
        }}>
          Painel Aeroporto
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
          Aeroporto Painel — Painel de Partidas com Patrocínio Integrado
        </div>
      </div>
    </div>
  );
};
