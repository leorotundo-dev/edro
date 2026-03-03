'use client';

import React from 'react';

interface JornalPrimeiraPaginaProps {
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

export const JornalPrimeiraPagina: React.FC<JornalPrimeiraPaginaProps> = ({
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
  const paperName = brandName ?? name ?? 'DIÁRIO NACIONAL';
  const mainHeadline = headline ?? title ?? 'Grande evento transforma cenário econômico do país';
  const bodyText = body ?? caption ?? description ?? text ?? 'A expectativa dos mercados se voltou para os desdobramentos que prometem redefinir as relações comerciais. Especialistas avaliam o impacto a longo prazo para os setores produtivos.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ width: 560, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', overflow: 'hidden', border: '1px solid #c8c2b0' }}>
      <style>{`
        @keyframes jpp-fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .jpp-fadein { animation: jpp-fadein 0.5s ease both; }
      `}</style>

      {/* Masthead */}
      <div style={{ background: brandColor, padding: '10px 16px 8px', borderBottom: '3px solid #111' }} className="jpp-fadein">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ color: '#fff', fontSize: 10, letterSpacing: 1, opacity: 0.85 }}>EST. 1942</span>
          <span style={{ color: '#fff', fontSize: 10, letterSpacing: 1, opacity: 0.85 }}>ANO LXXXII — Nº 28.741</span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: -1, textAlign: 'center', margin: 0, lineHeight: 1.1, textTransform: 'uppercase' }}>{paperName}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <span style={{ color: '#fff', fontSize: 9, opacity: 0.8, textTransform: 'capitalize' }}>{today}</span>
          <span style={{ color: '#fff', fontSize: 9, background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 2 }}>R$ 4,50</span>
        </div>
      </div>

      {/* Ticker bar */}
      <div style={{ background: '#111', padding: '4px 16px', display: 'flex', gap: 24, overflow: 'hidden' }}>
        {['Política', 'Economia', 'Esportes', 'Internacional', 'Tecnologia', 'Cultura'].map((s, i) => (
          <span key={i} style={{ color: '#e0d9c8', fontSize: 9, fontFamily: 'sans-serif', letterSpacing: 0.5, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{s}</span>
        ))}
      </div>

      {/* Main content */}
      <div style={{ padding: '12px 16px 8px' }}>
        {/* Hero story */}
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 10, marginBottom: 10 }}>
          {heroImage ? (
            <img src={heroImage} alt="Foto principal" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', marginBottom: 8 }} />
          ) : (
            <div style={{ width: '100%', height: 180, background: 'linear-gradient(135deg, #d0cfc0 0%, #b8b5a5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontFamily: 'sans-serif', color: '#777', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Manchete Principal</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.15, margin: '0 0 6px', letterSpacing: -0.5 }}>{mainHeadline}</h2>
              <p style={{ fontSize: 11, color: '#333', lineHeight: 1.6, margin: 0 }}>{bodyText}</p>
            </div>
          </div>
        </div>

        {/* 3-column secondary stories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0 }}>
          {[
            { section: 'Economia', hed: 'Mercados reagem com alta no pregão desta manhã', blurb: 'Bovespa registra ganhos expressivos após anúncio de política fiscal.' },
            { section: 'Política', hed: 'Congresso aprova nova medida com votos decisivos', blurb: 'Placar apertado define aprovação do projeto em segundo turno.' },
            { section: 'Internacional', hed: 'Cúpula mundial debate acordos de sustentabilidade', blurb: 'Líderes buscam consenso sobre metas climáticas para a próxima década.' },
          ].map((story, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ background: '#bbb', width: 1 }} />}
              <div style={{ padding: '0 10px' }}>
                <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>{story.section}</div>
                <h3 style={{ fontSize: 11, fontWeight: 800, color: '#111', lineHeight: 1.3, margin: '0 0 4px' }}>{story.hed}</h3>
                <p style={{ fontSize: 9.5, color: '#555', lineHeight: 1.5, margin: 0 }}>{story.blurb}</p>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ marginTop: 10, borderTop: '1px solid #c8c2b0', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888' }}>Tiragem: 120.000 exemplares</span>
          <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888' }}>www.{paperName.toLowerCase().replace(/\s/g,'')}.com.br</span>
          <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888' }}>ISSN 1234-5678</span>
        </div>
      </div>
    </div>
  );
};
