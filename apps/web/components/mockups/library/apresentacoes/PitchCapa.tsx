'use client';

import React from 'react';

interface PitchCapaProps {
  name?: string;
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
  themeColor?: string;
}

export const PitchCapa: React.FC<PitchCapaProps> = ({
  name,
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
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const companyName = brandName ?? name ?? 'NomeDaEmpresa';
  const tagline = headline ?? title ?? 'Transformando o futuro com tecnologia';
  const subText = body ?? caption ?? description ?? text ?? 'Apresentação Confidencial · 2026';

  const logoImg = profileImage ?? image ?? postImage ?? thumbnail ?? '';

  const accentDark = accent;
  const gradientStyle = {
    background: `linear-gradient(135deg, #0f172a 0%, #1e293b 40%, ${accent}22 100%)`,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        ...gradientStyle,
      }}
    >
      <style>{`
        @keyframes pitch-capa-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes pitch-capa-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background decorative circles */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '220px', height: '220px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
        animation: 'pitch-capa-pulse 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-40px', left: '30%',
        width: '160px', height: '160px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${accent}, ${accent}88, transparent)`,
      }} />

      {/* Left accent stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '4px',
        background: `linear-gradient(180deg, ${accent}, ${accent}44)`,
      }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: '28px 32px 24px 36px',
        animation: 'pitch-capa-fadein 0.6s ease-out',
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {logoImg ? (
              <img src={logoImg} alt="Logo da empresa" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }} />
            ) : (
              <div style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            )}
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {companyName}
            </span>
          </div>
          <div style={{
            background: `${accent}22`, border: `1px solid ${accent}55`,
            borderRadius: '20px', padding: '3px 10px',
            fontSize: '10px', fontWeight: 600, color: accent, letterSpacing: '0.06em',
          }}>
            APRESENTAÇÃO DE INVESTIMENTO
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: `${accent}18`, border: `1px solid ${accent}40`,
            borderRadius: '4px', padding: '2px 8px', marginBottom: '14px',
            fontSize: '10px', fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Série A · Rodada de Captação
          </div>

          <h1 style={{
            fontSize: '34px', fontWeight: 900, color: '#f8fafc',
            lineHeight: 1.1, margin: '0 0 10px 0',
            letterSpacing: '-0.02em',
          }}>
            {companyName}
          </h1>

          <p style={{
            fontSize: '15px', color: '#94a3b8', margin: '0 0 18px 0',
            fontWeight: 400, lineHeight: 1.5, maxWidth: '380px',
          }}>
            {tagline}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '2px', background: accent, borderRadius: '2px' }} />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{subText}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <span style={{ fontSize: '10px', color: '#475569' }}>Confidencial · Não distribuir</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[accent, `${accent}88`, `${accent}44`].map((c, i) => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{ fontSize: '10px', color: '#475569' }}>01 / 15</span>
        </div>
      </div>
    </div>
  );
};
