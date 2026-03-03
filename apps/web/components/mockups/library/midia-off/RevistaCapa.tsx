'use client';

import React from 'react';

interface RevistaCapaProps {
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

export const RevistaCapa: React.FC<RevistaCapaProps> = ({
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
  brandColor = '#e63946',
}) => {
  const brand = brandName ?? name ?? 'VEJA';
  const mainHeadline = headline ?? title ?? 'A revolução que ninguém viu chegar';
  const bodyText = body ?? caption ?? description ?? text ?? 'Exclusivo: os bastidores da mudança que vai transformar o Brasil';
  const coverImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const teasers = [
    'Especial: Economia em 2026',
    'Entrevista exclusiva com CEO',
    'Tecnologia que muda vidas',
  ];

  return (
    <div style={{ width: 340, height: 454, background: '#222', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes rcap-in { from { opacity: 0; } to { opacity: 1; } }
        .rcap-in { animation: rcap-in 0.5s ease both; }
      `}</style>

      {/* Full-bleed cover photo */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {coverImage ? (
          <img src={coverImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#2c3e50 0%,#34495e 40%,#1a252f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#556" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        {/* Dark gradient at top and bottom */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)' }} />
      </div>

      {/* Masthead */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="rcap-in">
        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1, textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1 }}>{brand}</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif', textTransform: 'capitalize' }}>{month}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif' }}>R$ 19,90</div>
        </div>
      </div>

      {/* Color masthead underline */}
      <div style={{ position: 'absolute', top: 58, left: 14, right: 14, height: 3, background: brandColor }} />

      {/* Left teasers */}
      <div style={{ position: 'absolute', top: 80, left: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {teasers.map((t, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.55)', padding: '3px 7px', backdropFilter: 'blur(2px)' }}>
            <span style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', lineHeight: 1.3 }}>{t}</span>
          </div>
        ))}
      </div>

      {/* Bottom copy */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 14px 12px' }}>
        <div style={{ display: 'inline-block', background: brandColor, padding: '2px 8px', marginBottom: 6 }}>
          <span style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Capa</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '0 0 5px', letterSpacing: -0.3, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{mainHeadline}</h2>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px', fontFamily: 'sans-serif', lineHeight: 1.4 }}>{bodyText}</p>

        {/* Barcode + price row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            {[2,1,3,1,2,1,1,2,1,3,1,2,1,1].map((w, i) => (
              <div key={i} style={{ width: w, height: i % 3 === 0 ? 20 : 15, background: '#fff', flexShrink: 0, opacity: 0.9 }} />
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif' }}>ISSN 0100-0000</div>
            <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>R$ 19,90</div>
          </div>
        </div>
      </div>
    </div>
  );
};
