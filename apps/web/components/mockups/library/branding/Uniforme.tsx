'use client';

import React from 'react';

interface UniformeProps {
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

export const Uniforme: React.FC<UniformeProps> = ({
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
  const resolvedBrand = brandName || name || username || 'MarcaDigital';
  const resolvedTagline = headline || title || body || caption || description || text || 'Equipe';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  // Derive a secondary color (darker variant)
  const collar = accent;

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes uni-appear { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .uni-wrap { animation: uni-appear 0.45s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Uniforme / Vestuário · Vista Frontal
      </div>

      <div className="uni-wrap" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Polo shirt — front view */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '180px', height: '200px' }}>
            <svg viewBox="0 0 180 200" width="180" height="200" xmlns="http://www.w3.org/2000/svg">
              {/* Body */}
              <path
                d="M45,40 L20,70 L0,65 L15,130 L35,130 L35,195 L145,195 L145,130 L165,130 L180,65 L160,70 L135,40 Q110,25 90,28 Q70,25 45,40 Z"
                fill="#f8faff"
                stroke="#e5e7eb"
                strokeWidth="1.5"
              />
              {/* Collar accent */}
              <path
                d="M45,40 Q70,25 90,28 Q110,25 135,40 L125,52 Q110,38 90,40 Q70,38 55,52 Z"
                fill={collar}
                opacity="0.9"
              />
              {/* Collar V-neck */}
              <path
                d="M75,48 Q90,70 105,48"
                fill="none"
                stroke={collar}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Left sleeve accent stripe */}
              <path
                d="M20,70 L0,65 L15,110 L35,110"
                fill={`${accent}33`}
                stroke={accent}
                strokeWidth="1"
              />
              {/* Right sleeve accent stripe */}
              <path
                d="M160,70 L180,65 L165,110 L145,110"
                fill={`${accent}33`}
                stroke={accent}
                strokeWidth="1"
              />
              {/* Sleeve cuff lines */}
              <line x1="14" y1="115" x2="34" y2="115" stroke={accent} strokeWidth="2" strokeLinecap="round" />
              <line x1="146" y1="115" x2="166" y2="115" stroke={accent} strokeWidth="2" strokeLinecap="round" />
              {/* Bottom hem accent */}
              <line x1="35" y1="188" x2="145" y2="188" stroke={accent} strokeWidth="2.5" />
              {/* Chest logo area */}
              <rect x="64" y="80" width="52" height="38" rx="6" fill={`${accent}12`} stroke={`${accent}33`} strokeWidth="1" strokeDasharray="3,2" />
            </svg>

            {/* Logo on chest */}
            <div
              style={{
                position: 'absolute',
                top: '83px',
                left: '67px',
                width: '46px',
                height: '32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
              }}
            >
              {resolvedLogo ? (
                <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
              ) : (
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '5px',
                    background: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 900,
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ fontSize: '6.5px', fontWeight: 800, color: '#111827', textAlign: 'center', lineHeight: 1, letterSpacing: '-0.01em' }}>
                {resolvedBrand.split(' ')[0]}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>Polo · Vista frontal</div>
        </div>

        {/* Details panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              padding: '14px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
              Especificações
            </div>
            {[
              { label: 'Tecido', value: 'Piquet 100% algodão' },
              { label: 'Aplicação', value: 'Bordado no peito' },
              { label: 'Tamanhos', value: 'PP ao GGG' },
              { label: 'Cor base', value: 'Branco / Cinza claro' },
              { label: 'Cor acento', value: resolvedBrand },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>{item.label}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#111827' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Color swatches */}
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              padding: '12px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Paleta do uniforme
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { color: accent, label: 'Acento' },
                { color: '#f8faff', label: 'Base', border: true },
                { color: '#ffffff', label: 'Bordado', border: true },
                { color: '#111827', label: 'Texto' },
              ].map((sw, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      background: sw.color,
                      border: sw.border ? '1px solid #e5e7eb' : 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                  <span style={{ fontSize: '8px', color: '#6b7280', fontWeight: 600 }}>{sw.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '9px', color: '#9ca3af', lineHeight: 1.5 }}>
            {resolvedTagline} · Crachá + polo<br />
            Bordado peito esq. · Patch nas costas
          </div>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af' }}>Uniforme corporativo · Polo + crachá + jaleco (opcional) · Pedido mínimo 12 peças</div>
    </div>
  );
};
