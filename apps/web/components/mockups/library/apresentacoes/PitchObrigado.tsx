'use client';

import React from 'react';

interface PitchObrigadoProps {
  name?: string;
  brandName?: string;
  username?: string;
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

export const PitchObrigado: React.FC<PitchObrigadoProps> = ({
  name,
  brandName,
  username,
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
  const company = brandName ?? name ?? 'Startup';
  const tagline = headline ?? title ?? 'Transformando o futuro com tecnologia';
  const thankMsg = body ?? caption ?? description ?? text ?? 'Estamos animados com a possibilidade de construir juntos.';
  const founderImg = profileImage ?? image ?? postImage ?? thumbnail ?? '';
  const handle = username ?? 'startup';

  const ctaItems = [
    { label: 'Agendar uma conversa', accent: true },
    { label: 'Receber o data room', accent: false },
  ];

  const contactLine = `${handle}@${company.toLowerCase()}.com.br`;

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#0f172a',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-obrig-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
        @keyframes pitch-obrig-fadein {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Decorative background glows */}
      <div style={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}28 0%, transparent 65%)`,
        animation: 'pitch-obrig-pulse 5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', right: '-60px',
        width: '240px', height: '240px', borderRadius: '50%',
        background: 'radial-gradient(circle, #8b5cf622 0%, transparent 65%)',
      }} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${accent}, ${accent}88, transparent)`,
      }} />
      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${accent}44, transparent)`,
      }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '28px 40px 24px',
        animation: 'pitch-obrig-fadein 0.6s ease-out',
      }}>

        {/* Company badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px',
        }}>
          {founderImg ? (
            <img
              src={founderImg}
              alt={company}
              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}` }}
            />
          ) : (
            <div style={{
              width: '28px', height: '28px', borderRadius: '7px',
              background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          )}
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {company}
          </span>
        </div>

        {/* Main "Obrigado!" */}
        <h1 style={{
          fontSize: '52px', fontWeight: 900, color: '#f8fafc',
          margin: '0 0 6px 0', letterSpacing: '-0.03em', lineHeight: 1,
          textAlign: 'center',
        }}>
          Obrigado!
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: '13px', color: accent, margin: '0 0 8px 0',
          fontWeight: 600, letterSpacing: '0.02em', textAlign: 'center',
        }}>
          {tagline}
        </p>

        <p style={{
          fontSize: '11px', color: '#64748b', margin: '0 0 20px 0',
          textAlign: 'center', maxWidth: '340px', lineHeight: 1.5,
        }}>
          {thankMsg}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {ctaItems.map((cta, i) => (
            <button
              key={i}
              type="button"
              aria-label={cta.label}
              style={{
                padding: '8px 18px', borderRadius: '7px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700, border: 'none',
                background: cta.accent ? accent : 'transparent',
                color: cta.accent ? '#fff' : accent,
                outline: cta.accent ? 'none' : `1.5px solid ${accent}`,
                boxShadow: cta.accent ? `0 4px 14px ${accent}44` : 'none',
              }}
            >
              {cta.label}
            </button>
          ))}
        </div>

        {/* Contact strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          background: '#1e293b', borderRadius: '8px',
          padding: '8px 18px', border: `1px solid ${accent}22`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>{contactLine}</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: '#334155' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>www.{company.toLowerCase()}.com.br</span>
          </div>
        </div>

        {/* Slide number */}
        <div style={{ position: 'absolute', bottom: '14px', right: '20px', fontSize: '10px', color: '#334155' }}>
          15 / 15
        </div>
      </div>
    </div>
  );
};
