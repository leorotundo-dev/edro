'use client';

import React from 'react';

interface JornalQuartoPaginaProps {
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

export const JornalQuartoPagina: React.FC<JornalQuartoPaginaProps> = ({
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
  brandColor = '#1a1a1a',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Sua melhor escolha está aqui';
  const bodyText = body ?? caption ?? description ?? text ?? 'Qualidade, preço e atendimento. Venha nos visitar ou ligue agora mesmo.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 300, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #222', boxShadow: '0 4px 16px rgba(0,0,0,0.16)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jqp-pop { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .jqp-pop { animation: jqp-pop 0.45s ease both; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: brandColor, padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="jqp-pop">
        <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>{brand}</span>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>Publicidade</span>
      </div>

      {/* Image */}
      <div style={{ width: '100%', height: 130, background: '#ccc9b8', overflow: 'hidden', position: 'relative' }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #ccc9b8 0%, #aaa89a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
      </div>

      {/* Copy */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ width: 28, height: 3, background: brandColor, marginBottom: 8 }} />
        <h2 style={{ fontSize: 15, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: '0 0 8px', letterSpacing: -0.2 }}>{mainHeadline}</h2>
        <p style={{ fontSize: 10, color: '#444', lineHeight: 1.6, margin: '0 0 12px' }}>{bodyText}</p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {['Entrega rápida', 'Garantia inclusa', 'Parcele sem juros'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, background: brandColor, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#333', fontFamily: 'sans-serif' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact footer */}
      <div style={{ background: '#111', padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#fff', fontFamily: 'sans-serif', fontWeight: 600 }}>(11) 9 9999-0000</span>
        <span style={{ fontSize: 8, color: '#aaa', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</span>
      </div>
    </div>
  );
};
