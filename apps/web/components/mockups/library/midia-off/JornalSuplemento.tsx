'use client';

import React from 'react';

interface JornalSuplementoProps {
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

export const JornalSuplemento: React.FC<JornalSuplementoProps> = ({
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
  brandColor = '#7b2d8b',
}) => {
  const brand = brandName ?? name ?? 'DIÁRIO NACIONAL';
  const sectionTitle = headline ?? title ?? 'Suplemento Especial';
  const bodyText = body ?? caption ?? description ?? text ?? 'Uma edição especial dedicada às histórias que moldam o nosso tempo. Reportagens exclusivas, análises aprofundadas e muito mais neste caderno especial.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const articles = [
    { tag: 'Capa', hed: 'O futuro da economia brasileira em 2026' },
    { tag: 'Especial', hed: 'Como a tecnologia redefine o trabalho' },
  ];

  return (
    <div style={{ width: 360, background: '#fff', fontFamily: '"Georgia", "Times New Roman", serif', border: '1px solid #d0d0d0', boxShadow: '0 4px 20px rgba(0,0,0,0.16)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jsup-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .jsup-in { animation: jsup-in 0.5s ease both; }
      `}</style>

      {/* Glossy-feel header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 100%)`, padding: '14px 18px' }} className="jsup-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>Suplemento</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1.05 }}>{sectionTitle}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif' }}>{brand}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif', marginTop: 2 }}>{new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        {/* Decorative line */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.35)', marginTop: 10, borderRadius: 1 }} />
      </div>

      {/* Feature story with hero image */}
      <div style={{ display: 'flex', height: 140 }}>
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: brandColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Reportagem Principal</div>
          <p style={{ fontSize: 11, color: '#222', lineHeight: 1.6, margin: 0 }}>{bodyText}</p>
        </div>
        <div style={{ width: 130, flexShrink: 0, background: '#e8e5d8', overflow: 'hidden' }}>
          {heroImage ? (
            <img src={heroImage} alt={sectionTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#dbd9cc 0%,#b5b3a8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
          )}
        </div>
      </div>

      {/* Article list */}
      <div style={{ borderTop: `3px solid ${brandColor}`, padding: '10px 14px' }}>
        {articles.map((art, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < articles.length - 1 ? 8 : 0, marginBottom: i < articles.length - 1 ? 8 : 0, borderBottom: i < articles.length - 1 ? '1px solid #e8e5d8' : 'none' }}>
            <div style={{ width: 48, height: 36, background: '#e0ddd0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 7.5, fontFamily: 'sans-serif', color: brandColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{art.tag}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#111', lineHeight: 1.3 }}>{art.hed}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: '#111', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#fff' }}>{brand}</span>
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>Suplemento — distribuição gratuita</span>
      </div>
    </div>
  );
};
