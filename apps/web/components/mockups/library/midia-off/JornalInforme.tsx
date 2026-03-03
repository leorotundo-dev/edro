'use client';

import React from 'react';

interface JornalInformeProps {
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

export const JornalInforme: React.FC<JornalInformeProps> = ({
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
  const brand = brandName ?? name ?? 'Empresa S.A.';
  const mainHeadline = headline ?? title ?? 'Como nossa solução transformou resultados para milhares de clientes';
  const bodyText = body ?? caption ?? description ?? text ?? 'Em um cenário de constantes transformações, contar com o parceiro certo faz toda a diferença. Nossa empresa atua há mais de 20 anos oferecendo soluções que realmente funcionam, com atendimento dedicado e resultados comprovados.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ width: 420, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '1px solid #c8c2b0', boxShadow: '0 4px 18px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jinf-in { from { opacity: 0; } to { opacity: 1; } }
        .jinf-in { animation: jinf-in 0.5s ease both; }
      `}</style>

      {/* "Informe Publicitário" badge */}
      <div style={{ background: '#f0ede0', borderBottom: '1px solid #c8c2b0', padding: '4px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="jinf-in">
        <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>Informe Publicitário</span>
        <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#aaa' }}>{today}</span>
      </div>

      {/* Article-style header */}
      <div style={{ padding: '14px 18px 10px', borderBottom: '2px solid #111' }}>
        <div style={{ fontSize: 9, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{brand}</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: 0, letterSpacing: -0.4 }}>{mainHeadline}</h1>
      </div>

      {/* Hero image */}
      <div style={{ width: '100%', height: 160, background: '#ccc9b8', overflow: 'hidden', position: 'relative' }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#ccc9b8 0%,#a8a59a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexDirection: 'column' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 9, color: '#888', fontFamily: 'sans-serif' }}>Foto ilustrativa</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', padding: '4px 14px' }}>
          <span style={{ fontSize: 8, color: '#ddd', fontFamily: 'sans-serif', fontStyle: 'italic' }}>Legenda da foto — {brand}</span>
        </div>
      </div>

      {/* Journalistic body — two columns */}
      <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 0 }}>
        <div style={{ paddingRight: 14 }}>
          <p style={{ fontSize: 11, color: '#333', lineHeight: 1.7, margin: 0 }}>{bodyText}</p>
        </div>
        <div style={{ background: '#d0cfc0' }} />
        <div style={{ paddingLeft: 14 }}>
          <p style={{ fontSize: 11, color: '#333', lineHeight: 1.7, margin: '0 0 10px' }}>Com tecnologia avançada e equipe especializada, entregamos resultados que superam expectativas. Nosso compromisso é com a excelência em cada projeto.</p>
          <div style={{ border: `1px solid ${brandColor}`, padding: '8px 10px', background: '#fffdf7' }}>
            <div style={{ fontSize: 9, color: brandColor, fontFamily: 'sans-serif', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Depoimento</div>
            <p style={{ fontSize: 9.5, color: '#444', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"Os resultados superaram todas as nossas expectativas. Recomendo sem hesitar."</p>
            <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif', marginTop: 4 }}>— João S., Cliente desde 2019</div>
          </div>
        </div>
      </div>

      {/* Contact footer */}
      <div style={{ background: brandColor, padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>{brand.toUpperCase()}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'sans-serif' }}>(11) 9 9999-0000 | www.{brand.toLowerCase().replace(/[\s.]/g, '')}.com.br</div>
      </div>
    </div>
  );
};
