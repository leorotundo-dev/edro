'use client';

import React from 'react';

interface JornalTriplexProps {
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

export const JornalTriplex: React.FC<JornalTriplexProps> = ({
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
  const mainHeadline = headline ?? title ?? 'Três páginas de história: a maior cobertura do ano em um formato inédito';
  const bodyText = body ?? caption ?? description ?? text ?? 'Uma cobertura sem precedentes que atravessa três páginas completas.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const columns = [
    { tag: 'Página 1', hed: 'O começo de tudo', body: 'Os primeiros sinais surgiram nas primeiras horas da manhã, quando os mercados ainda dormiam e poucos percebiam a magnitude do que estava por vir.' },
    { tag: 'Página 2', hed: 'O ponto de virada', body: 'A decisão tomada em reunião de emergência redefiniu os rumos e acelerou um processo que parecia levar anos para se concretizar.' },
    { tag: 'Página 3', hed: 'O que vem a seguir', body: 'Especialistas divergem sobre os próximos passos, mas há consenso em um ponto: nada será como antes. A transformação é irreversível.' },
  ];

  return (
    <div style={{ width: 560, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #111', boxShadow: '0 6px 28px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jtrip-in { from { opacity: 0; } to { opacity: 1; } }
        .jtrip-in { animation: jtrip-in 0.6s ease both; }
      `}</style>

      {/* Masthead */}
      <div style={{ background: '#111', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="jtrip-in">
        <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'sans-serif' }}>{today}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -1, textTransform: 'uppercase' }}>{brand}</div>
        <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'sans-serif' }}>Triplex — 3 páginas</div>
      </div>

      {/* Color rule */}
      <div style={{ height: 4, background: brandColor }} />

      {/* Hero panoramic image */}
      <div style={{ width: '100%', height: 200, position: 'relative', overflow: 'hidden' }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(120deg,#d8d5c5 0%,#b5b2a3 33%,#c8c5b5 66%,#d0cdbf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'sans-serif' }}>Foto panorâmica — tripla página</span>
          </div>
        )}
        {/* Two gutter lines */}
        {[33, 66].map(pct => (
          <div key={pct} style={{ position: 'absolute', top: 0, left: `${pct}%`, transform: 'translateX(-50%)', width: 6, height: '100%', background: 'rgba(0,0,0,0.15)', pointerEvents: 'none' }} />
        ))}
        {/* Headline overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)', padding: '28px 24px 14px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: 0, letterSpacing: -0.4, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{mainHeadline}</h2>
        </div>
      </div>

      {/* Three-column text */}
      <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0 }}>
        {columns.map((col, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ background: '#c8c2b0' }} />}
            <div style={{ padding: i === 0 ? '0 14px 0 0' : i === 2 ? '0 0 0 14px' : '0 14px' }}>
              <div style={{ fontSize: 7.5, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>{col.tag}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#111', lineHeight: 1.25, marginBottom: 5 }}>{col.hed}</div>
              <p style={{ fontSize: 10, color: '#444', lineHeight: 1.65, margin: 0 }}>{col.body}</p>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: '#111', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#fff' }}>{brand}</span>
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>Formato Triplex — 3 páginas completas</span>
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>Anuncie: (11) 9 9999-0000</span>
      </div>
    </div>
  );
};
