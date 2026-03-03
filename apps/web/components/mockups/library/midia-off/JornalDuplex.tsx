'use client';

import React from 'react';

interface JornalDuplexProps {
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

export const JornalDuplex: React.FC<JornalDuplexProps> = ({
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
  const brand = brandName ?? name ?? 'DIÁRIO NACIONAL';
  const mainHeadline = headline ?? title ?? 'Expansão histórica transforma panorama do setor e abre novas fronteiras';
  const bodyText = body ?? caption ?? description ?? text ?? 'Em uma virada sem precedentes, o mercado nacional registrou crescimento acima das projeções, consolidando uma tendência que especialistas acompanhavam há meses.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ width: 560, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #111', boxShadow: '0 6px 28px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jdup-in { from { opacity: 0; } to { opacity: 1; } }
        .jdup-in { animation: jdup-in 0.6s ease both; }
      `}</style>

      {/* Masthead strip */}
      <div style={{ background: '#111', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="jdup-in">
        <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'sans-serif' }}>{today}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -1, textTransform: 'uppercase' }}>{brand}</div>
        <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'sans-serif' }}>Edição Duplex</div>
      </div>

      {/* Color rule */}
      <div style={{ height: 4, background: brandColor }} />

      {/* Panoramic hero image spanning both pages */}
      <div style={{ width: '100%', height: 240, position: 'relative', overflow: 'hidden' }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(120deg,#d8d5c5 0%,#b5b2a3 50%,#ccc9b8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'sans-serif' }}>Foto panorâmica — dupla página</span>
          </div>
        )}
        {/* Gutter shadow overlay */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 8, height: '100%', background: 'rgba(0,0,0,0.18)', pointerEvents: 'none' }} />
        {/* Headline overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)', padding: '30px 24px 16px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: 0, letterSpacing: -0.5, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{mainHeadline}</h2>
        </div>
      </div>

      {/* Body copy — two columns */}
      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0 }}>
        <div style={{ paddingRight: 16 }}>
          <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>Análise</div>
          <p style={{ fontSize: 11, color: '#333', lineHeight: 1.7, margin: 0 }}>{bodyText}</p>
        </div>
        <div style={{ background: '#c8c2b0' }} />
        <div style={{ paddingLeft: 16 }}>
          <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>Contexto</div>
          <p style={{ fontSize: 11, color: '#333', lineHeight: 1.7, margin: 0 }}>Os números revelam uma transformação estrutural que vai além do ciclo econômico convencional, apontando para uma nova fase de consolidação e crescimento sustentável no longo prazo.</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: 0.5 }}>{brand}</span>
        <div style={{ width: 1, height: 12, background: '#555' }} />
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>Anuncie: (11) 9 9999-0000</span>
        <div style={{ width: 1, height: 12, background: '#555' }} />
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>Formato Duplex — 2 páginas completas</span>
      </div>
    </div>
  );
};
