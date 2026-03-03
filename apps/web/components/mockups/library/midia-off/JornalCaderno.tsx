'use client';

import React from 'react';

interface JornalCadernoProps {
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

export const JornalCaderno: React.FC<JornalCadernoProps> = ({
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
  brandColor = '#c0392b',
}) => {
  const brand = brandName ?? name ?? 'DIÁRIO NACIONAL';
  const sectionTitle = headline ?? title ?? 'Caderno Especial';
  const bodyText = body ?? caption ?? description ?? text ?? 'As principais notícias e análises desta edição especial, com cobertura exclusiva dos eventos mais relevantes da semana.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const miniArticles = [
    { tag: 'Economia', hed: 'Mercados fecham em alta após reunião do Copom' },
    { tag: 'Política', hed: 'Câmara aprova proposta com placar apertado' },
    { tag: 'Cultura', hed: 'Festival nacional reúne milhares no centro' },
  ];

  return (
    <div style={{ width: 360, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '1px solid #c8c2b0', boxShadow: '0 4px 18px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jcad-in { from { opacity: 0; } to { opacity: 1; } }
        .jcad-in { animation: jcad-in 0.5s ease both; }
      `}</style>

      {/* Section header */}
      <div style={{ background: brandColor, padding: '10px 16px' }} className="jcad-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>Caderno</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>{sectionTitle}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif' }}>{brand}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', marginTop: 2 }}>Edição de hoje</div>
          </div>
        </div>
      </div>

      {/* Thin rule */}
      <div style={{ height: 3, background: '#111' }} />

      {/* Hero preview */}
      <div style={{ display: 'flex', height: 120 }}>
        <div style={{ width: 140, flexShrink: 0, background: '#ccc9b8', overflow: 'hidden' }}>
          {heroImage ? (
            <img src={heroImage} alt={sectionTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#ccc8b5 0%,#aaa89a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, padding: '10px 14px', borderLeft: '1px solid #d0cfc0' }}>
          <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>Destaque</div>
          <p style={{ fontSize: 11, color: '#222', lineHeight: 1.55, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#d0cfc0', margin: '0 16px' }} />

      {/* 3 mini article cards */}
      <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {miniArticles.map((art, i) => (
          <div key={i} style={{ borderTop: `2px solid ${brandColor}`, paddingTop: 6 }}>
            <div style={{ fontSize: 7, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 3 }}>{art.tag}</div>
            <p style={{ fontSize: 9, color: '#222', lineHeight: 1.45, margin: 0 }}>{art.hed}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: '#111', padding: '7px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: 0.5 }}>{brand.toUpperCase()}</span>
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>Toda segunda-feira</span>
      </div>
    </div>
  );
};
