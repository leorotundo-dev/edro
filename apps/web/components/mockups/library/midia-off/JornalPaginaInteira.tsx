'use client';

import React from 'react';

interface JornalPaginaInteiraProps {
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

export const JornalPaginaInteira: React.FC<JornalPaginaInteiraProps> = ({
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
  const brand = brandName ?? name ?? 'Nome da Empresa';
  const mainHeadline = headline ?? title ?? 'A solução que você precisava está aqui';
  const bodyText = body ?? caption ?? description ?? text ?? 'Descubra como nossa proposta transforma resultados. Qualidade comprovada, entrega garantida e suporte especializado para o seu negócio crescer com segurança.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 420, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #111', boxShadow: '0 6px 28px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jpi-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .jpi-rise { animation: jpi-rise 0.55s ease both; }
      `}</style>

      {/* Top rule */}
      <div style={{ height: 6, background: brandColor }} />

      {/* Header */}
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #d0cfc0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }} className="jpi-rise">
        <div>
          <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Publicidade</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111', letterSpacing: -0.5, textTransform: 'uppercase' }}>{brand}</div>
        </div>
        <div style={{ width: 48, height: 48, background: brandColor, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
      </div>

      {/* Hero image — 60% of page */}
      <div style={{ width: '100%', height: 252, background: '#d0cfc0', overflow: 'hidden', position: 'relative' }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #ccc8b8 0%, #b0ad9e 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: '#888', fontFamily: 'sans-serif' }}>Imagem do produto</span>
          </div>
        )}
        {/* Overlay caption band */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '6px 14px' }}>
          <span style={{ fontSize: 9, color: '#fff', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>Foto ilustrativa</span>
        </div>
      </div>

      {/* Body copy */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ width: 36, height: 3, background: brandColor, marginBottom: 10 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: '0 0 10px', letterSpacing: -0.3 }}>{mainHeadline}</h2>
        <p style={{ fontSize: 11, color: '#444', lineHeight: 1.7, margin: '0 0 14px' }}>{bodyText}</p>

        {/* Feature bullets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {['Qualidade certificada e garantida', 'Atendimento personalizado 24h', 'Entrega em todo o território nacional'].map((feat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, background: brandColor, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#333', fontFamily: 'sans-serif' }}>{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA bar */}
        <div style={{ background: brandColor, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif', marginBottom: 2 }}>Entre em contato</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
          </div>
          <div style={{ fontSize: 11, color: '#fff', fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: 0.5 }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
        </div>
      </div>

      {/* Bottom rule */}
      <div style={{ height: 4, background: '#111' }} />
    </div>
  );
};
