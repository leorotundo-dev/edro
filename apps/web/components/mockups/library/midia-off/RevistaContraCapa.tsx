'use client';

import React from 'react';

interface RevistaContraCapaProps {
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

export const RevistaContraCapa: React.FC<RevistaContraCapaProps> = ({
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
  brandColor = '#1e1b4b',
}) => {
  const brand = brandName ?? name ?? 'Marca Elite';
  const mainHeadline = headline ?? title ?? 'A capa que fecha — e abre caminhos para a sua marca';
  const bodyText = body ?? caption ?? description ?? text ?? 'A contracapa externa é o espaço de maior nobreza da publicidade em revistas. Vista por todos antes mesmo de a edição ser aberta. Sua marca merece este lugar.';
  const coverImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const stats = [
    { value: '98%', label: 'de leitores veem' },
    { value: '1ª', label: 'posição no impacto' },
    { value: '3×', label: 'mais lembrada' },
  ];

  return (
    <div style={{ width: 340, height: 454, background: brandColor, fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 14px 48px rgba(0,0,0,0.50)', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes rcc-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .rcc-in { animation: rcc-in 0.65s ease both; }
        @keyframes rcc-scale { from{transform:scale(1.07)} to{transform:scale(1)} }
        .rcc-scale { animation: rcc-scale 0.9s ease both; }
        @keyframes rcc-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .rcc-glow { animation: rcc-glow 3s ease infinite; }
      `}</style>

      {/* Full bleed background image */}
      <div style={{ position: 'absolute', inset: 0 }} className="rcc-scale">
        {coverImage ? (
          <img src={coverImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(155deg, ${brandColor} 0%, #3730a3 40%, #1e1b4b 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        {/* Multi-layer dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${brandColor}aa 0%, ${brandColor}66 30%, ${brandColor}22 55%, ${brandColor}99 80%, ${brandColor}f0 100%)` }} />
      </div>

      {/* Top shimmer accent */}
      <div className="rcc-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #818cf8 30%, #a5b4fc 50%, #818cf8 70%, transparent)' }} />

      {/* Top brand badge */}
      <div style={{ position: 'absolute', top: 20, left: 20 }} className="rcc-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 }}>{brand}</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.55)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.5 }}>Contracapa Exclusiva</div>
          </div>
        </div>
      </div>

      {/* Stats row — mid position */}
      <div style={{ position: 'absolute', top: 160, left: 20, right: 20 }} className="rcc-in">
        <div style={{ display: 'flex', gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 6px', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom content block */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 22px 22px' }} className="rcc-in">

        {/* Indigo rule with label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, #818cf8, transparent)' }} />
          <span style={{ fontSize: 8, color: '#818cf8', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Posição de Honra</span>
          <div style={{ height: 1, flex: 1, background: 'linear-gradient(270deg, #818cf8, transparent)' }} />
        </div>

        {/* Headline */}
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: '0 0 12px', letterSpacing: -0.4, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{mainHeadline}</h2>

        {/* Accent line */}
        <div style={{ width: 55, height: 2, background: 'linear-gradient(90deg, #818cf8, #a5b4fc)', marginBottom: 14 }} />

        {/* Body */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', lineHeight: 1.68, margin: '0 0 20px', fontFamily: 'sans-serif' }}>{bodyText}</p>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ border: '1px solid rgba(129,140,248,0.6)', padding: '8px 22px' }}>
            <span style={{ fontSize: 9, color: '#a5b4fc', fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Anuncie aqui</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', marginBottom: 2 }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #818cf8 30%, #a5b4fc 50%, #818cf8 70%, transparent)' }} />
    </div>
  );
};
