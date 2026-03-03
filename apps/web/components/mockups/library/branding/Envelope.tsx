'use client';

import React from 'react';

interface EnvelopeProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const Envelope: React.FC<EnvelopeProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#1a56db',
}) => {
  const resolvedBrand = brandName || name || username || 'Empresa Digital Ltda.';
  const resolvedAddr = headline || title || body || caption || description || text || 'Av. Paulista, 1000 · São Paulo, SP · 01310-100';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes env-appear { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .env-wrap { animation: env-appear 0.5s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Envelope · DL (22×11 cm) · Frente
      </div>

      {/* Envelope body */}
      <div
        className="env-wrap"
        style={{
          width: '420px',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Flap fold line (top) */}
        <div
          style={{
            position: 'relative',
            height: '60px',
            background: `linear-gradient(160deg, #f3f4f6 0%, #e9eaf0 100%)`,
            overflow: 'hidden',
          }}
        >
          {/* Triangular flap shape via clip */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(170deg, #e5e7eb 0%, #d1d5db 100%)`,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />
          {/* Flap fold line */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'rgba(0,0,0,0.12)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              color: '#9ca3af',
              fontWeight: 600,
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}
          >
            — Dobra / Aba —
          </div>
        </div>

        {/* Envelope front */}
        <div
          style={{
            background: '#ffffff',
            padding: '20px 24px 22px',
            minHeight: '180px',
            position: 'relative',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {/* Color accent bar at top of front */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`,
            }}
          />

          {/* Top row: logo + brand (return address) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '4px' }}>
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={resolvedBrand}
                style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '7px',
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}aa 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {resolvedBrand.charAt(0)}
              </div>
            )}

            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>{resolvedBrand}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{resolvedAddr}</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>contato@empresadigital.com.br</div>
            </div>
          </div>

          {/* Center: destination address block */}
          <div
            style={{
              margin: '22px auto 0',
              width: '200px',
              padding: '14px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: '#fafafa',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' }}>
              Destinatário
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>Nome do Destinatário</div>
            <div style={{ fontSize: '10.5px', color: '#4b5563', marginTop: '2px', lineHeight: 1.5 }}>
              Rua das Flores, 250 — Sala 42<br />
              Belo Horizonte, MG · 30130-170
            </div>
          </div>

          {/* Bottom: postage area */}
          <div style={{ position: 'absolute', bottom: '14px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div
              style={{
                width: '52px',
                height: '66px',
                border: '1px dashed #d1d5db',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="m22 3-10 9L2 3" />
              </svg>
              <div style={{ fontSize: '7px', color: '#d1d5db', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>SELO<br />POSTAL</div>
            </div>
          </div>

          {/* Bottom-left: barcode decoration */}
          <div style={{ position: 'absolute', bottom: '14px', left: '24px', display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
            {[6, 12, 8, 14, 6, 10, 14, 8, 6, 12, 10, 14, 8, 6, 12].map((h, i) => (
              <div key={i} style={{ width: '2px', height: `${h}px`, background: '#d1d5db', borderRadius: '1px' }} />
            ))}
          </div>
        </div>

        {/* Bottom flap triangle */}
        <div
          style={{
            height: '40px',
            background: '#f3f4f6',
            position: 'relative',
            overflow: 'hidden',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#ececf0',
              clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Formato DL · 220×110mm · Offset 90g · Fechamento adesivo</div>
    </div>
  );
};
