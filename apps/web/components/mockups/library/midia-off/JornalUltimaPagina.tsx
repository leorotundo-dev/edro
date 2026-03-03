'use client';

import React from 'react';

interface JornalUltimaPaginaProps {
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

export const JornalUltimaPagina: React.FC<JornalUltimaPaginaProps> = ({
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
  const brand = brandName ?? name ?? 'Marca Líder';
  const mainHeadline = headline ?? title ?? 'Feche com chave de ouro: a última palavra é nossa';
  const bodyText = body ?? caption ?? description ?? text ?? 'A contracapa do jornal é o espaço de maior visibilidade e impacto. Nosso anúncio aqui garante que a última impressão seja a mais forte.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 420, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '3px solid #111', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
      <style>{`
        @keyframes julp-rise { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .julp-rise { animation: julp-rise 0.55s ease both; }
        @keyframes julp-glow { 0%,100%{box-shadow:0 0 0 0 rgba(26,26,26,0)} 50%{box-shadow:0 0 16px 2px rgba(26,26,26,0.15)} }
        .julp-glow { animation: julp-glow 3s ease infinite; }
      `}</style>

      {/* Bold top bar */}
      <div style={{ background: brandColor, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="julp-rise">
        <div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 3 }}>Última página</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.3, textTransform: 'uppercase' }}>{brand}</div>
        </div>
        <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
      </div>

      {/* Large hero image */}
      <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }} className="julp-glow">
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg,#d5d2c2 0%,#b0ada0 50%,#d0cdbf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'sans-serif' }}>Imagem de destaque</span>
          </div>
        )}
        {/* Gradient caption bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '5px 14px' }}>
          <span style={{ fontSize: 8, color: '#eee', fontFamily: 'sans-serif' }}>Alta visibilidade · Contracapa do jornal</span>
        </div>
      </div>

      {/* Bold headline + copy */}
      <div style={{ padding: '14px 18px' }}>
        <div style={{ width: 40, height: 4, background: brandColor, marginBottom: 10 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: '0 0 10px', letterSpacing: -0.4 }}>{mainHeadline}</h2>
        <p style={{ fontSize: 11, color: '#444', lineHeight: 1.7, margin: '0 0 14px' }}>{bodyText}</p>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { num: '120mil', label: 'leitores/dia' },
            { num: '#1', label: 'em visibilidade' },
            { num: '100%', label: 'cobertura' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: '#f0ede0', borderRadius: 3 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: brandColor, lineHeight: 1 }}>{stat.num}</div>
              <div style={{ fontSize: 8, color: '#777', fontFamily: 'sans-serif', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA footer */}
      <div style={{ background: '#111', padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif', marginBottom: 2 }}>Entre em contato</div>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
        </div>
        <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
      </div>
    </div>
  );
};
