'use client';

import React from 'react';

interface RevistaSegundaCapaProps {
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

export const RevistaSegundaCapa: React.FC<RevistaSegundaCapaProps> = ({
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
  brandColor = '#2d6a4f',
}) => {
  const brand = brandName ?? name ?? 'Marca Premium';
  const mainHeadline = headline ?? title ?? 'Onde a excelência encontra o estilo';
  const bodyText = body ?? caption ?? description ?? text ?? 'Uma experiência única criada para quem não abre mão do melhor. Descubra nossa nova coleção.';
  const coverImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 340, height: 454, background: '#111', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 8px 32px rgba(0,0,0,0.35)', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes r2c-in { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
        .r2c-in { animation: r2c-in 0.6s ease both; }
      `}</style>

      {/* Full bleed image */}
      <div style={{ position: 'absolute', inset: 0 }} className="r2c-in">
        {coverImage ? (
          <img src={coverImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg, ${brandColor}33 0%, #111 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.92) 100%)' }} />
      </div>

      {/* Premium placement badge */}
      <div style={{ position: 'absolute', top: 14, right: 14, background: brandColor, padding: '4px 10px' }}>
        <span style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>2ª Capa</span>
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px' }}>
        {/* Brand name */}
        <div style={{ fontSize: 11, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>{brand}</div>

        {/* Headline */}
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.15, margin: '0 0 10px', letterSpacing: -0.5 }}>{mainHeadline}</h2>

        {/* Decorative rule */}
        <div style={{ width: 50, height: 2, background: brandColor, marginBottom: 12 }} />

        {/* Body */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 16px', fontFamily: 'sans-serif' }}>{bodyText}</p>

        {/* CTA */}
        <div style={{ display: 'inline-block', border: `1px solid ${brandColor}`, padding: '7px 18px' }}>
          <span style={{ fontSize: 10, color: brandColor, fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Saiba mais</span>
        </div>
      </div>
    </div>
  );
};
